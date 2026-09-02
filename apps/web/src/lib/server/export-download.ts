import {
  appendOperationalAudit,
  WorkspaceExportService,
  type ExportDataset,
  type ExportDocument,
  type ExportFormat,
} from "@oiw/application";
import type { Workspace } from "@oiw/contracts";
import type { PersistenceRepositories } from "@oiw/persistence";

import { getRepositories } from "@/lib/server/db";
import { enforceGuestRateLimit, GuestRateLimitError } from "@/lib/server/rate-limit";
import { readSessionPayload } from "@/lib/server/session";

interface ExportDownloadDependencies {
  repositories(): PersistenceRepositories;
  readSessionPayload: typeof readSessionPayload;
  enforceRateLimit: typeof enforceGuestRateLimit;
  now(): Date;
}

const defaultDependencies: ExportDownloadDependencies = {
  repositories: getRepositories,
  readSessionPayload,
  enforceRateLimit: enforceGuestRateLimit,
  now: () => new Date(),
};

function unavailable(): Response {
  return Response.json({ error: "Export unavailable." }, { status: 404 });
}

function safeFilenameSegment(value: string): string {
  const safe = value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe.length === 0 ? "workspace" : safe.slice(0, 80);
}

function streamDocument(document: ExportDocument): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const iterator = document.chunks[Symbol.iterator]();
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = iterator.next();
      if (next.done) controller.close();
      else controller.enqueue(encoder.encode(next.value));
    },
    cancel() {
      iterator.return?.();
    },
  });
}

async function resolveWorkspace(
  slug: string,
  dependencies: ExportDownloadDependencies,
): Promise<{ repositories: PersistenceRepositories; workspace: Workspace; sessionId: string } | null> {
  const payload = await dependencies.readSessionPayload();
  if (payload === null) return null;
  const repositories = dependencies.repositories();
  const workspace = await repositories.workspaces.findBySlug(slug);
  if (
    workspace === null ||
    workspace.id !== payload.workspaceId ||
    (workspace.expiresAt !== null && Date.parse(workspace.expiresAt) <= dependencies.now().getTime())
  ) {
    return null;
  }
  return { repositories, workspace, sessionId: payload.sessionId };
}

export async function handleExportDownload(
  slug: string,
  dataset: string,
  format: string,
  dependencies: ExportDownloadDependencies = defaultDependencies,
): Promise<Response> {
  if ((dataset !== "cases" && dataset !== "audit") || (format !== "csv" && format !== "json")) {
    return Response.json({ error: "Unsupported export request." }, { status: 400 });
  }

  const resolved = await resolveWorkspace(slug, dependencies);
  if (resolved === null) return unavailable();
  const { repositories, workspace, sessionId } = resolved;

  try {
    await dependencies.enforceRateLimit("export", workspace);
  } catch (error) {
    if (error instanceof GuestRateLimitError) {
      return Response.json(
        { error: error.message },
        { status: error.status, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    throw error;
  }

  try {
    await appendOperationalAudit(repositories.auditEntries, {
      workspaceId: workspace.id,
      occurredAt: dependencies.now().toISOString(),
      action: "export",
      actorId: sessionId,
      actorType: "human",
      subject: { type: "workspace", id: workspace.id },
      cause: "Guest downloaded synthetic demo data",
      data: { dataset, format, syntheticDataOnly: true },
    });
    const service = new WorkspaceExportService(repositories);
    const document = await exportDocument(service, workspace.id, dataset, format);
    const filename = `${dataset}-${safeFilenameSegment(workspace.slug)}.${document.extension}`;
    return new Response(streamDocument(document), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": document.contentType,
        "X-Content-Type-Options": "nosniff",
        "X-Synthetic-Data": "true",
      },
    });
  } catch (error) {
    console.error("Could not export synthetic workspace data", error);
    return Response.json({ error: "Could not create the export." }, { status: 500 });
  }
}

function exportDocument(
  service: WorkspaceExportService,
  workspaceId: string,
  dataset: ExportDataset,
  format: ExportFormat,
): Promise<ExportDocument> {
  return dataset === "cases"
    ? service.exportCases(workspaceId, format)
    : service.exportAudit(workspaceId, format);
}
