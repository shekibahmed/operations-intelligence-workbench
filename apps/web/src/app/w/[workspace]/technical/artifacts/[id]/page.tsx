import { notFound } from "next/navigation";
import type { ArtifactSegment } from "@oiw/contracts";

import { CopyableJson } from "@/components/ui/CopyableJson";
import { InspectorTabs } from "@/components/ui/InspectorTabs";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionCard } from "@/components/ui/SectionCard";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { getRepositories } from "@/lib/server/db";
import { getWorkspaceContext } from "@/lib/server/context";
import { minutesRemaining } from "@/lib/session-time";
import { resolveScreenState } from "@/types/screen-state";

function formatLocator(locator: ArtifactSegment["locator"]): string {
  switch (locator.kind) {
    case "text-range":
      return `Characters ${locator.start}–${locator.end}`;
    case "page":
      return `Page ${locator.page}`;
    case "table-cell":
      return `Row ${locator.row}, column ${locator.column}`;
    case "json-path":
      return `Path ${locator.path}`;
    case "attachment":
      return `Attachment ${locator.attachmentId}`;
  }
}

export default async function TechnicalArtifactInspectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug, id } = await params;
  const base = workspaceBase(slug);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("technical-artifact", `${base}/technical/artifacts/${id}`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const { workspace, labels } = await getWorkspaceContext(slug);

  const repositories = getRepositories();
  const artifact = await repositories.artifacts.findById(workspace.id, id);
  if (artifact === null) notFound();

  const segments = await repositories.artifactSegments.listByArtifact(workspace.id, id);

  return (
    <WorkspaceShell
      workspace={slug}
      packName={labels.packName}
      packId={labels.packId}
      lens={lens}
      sessionMinutesRemaining={minutesRemaining(workspace.expiresAt)}
      itemLabel={artifact.artifactType}
      defaultArtifactId={DEFAULT_ARTIFACT_ID}
      defaultRuleId={DEFAULT_RULE_ID}
    >
      <InspectorTabs
        active="artifact"
        artifactHref={`${base}/technical/artifacts/${artifact.id}`}
        ruleHref={`${base}/technical/rules/${DEFAULT_RULE_ID}`}
      />

      {state === "error" ? (
        <ErrorState message="Could not load derived data for this artifact. The raw artifact remains available above." />
      ) : (
        <>
          <SectionCard title="Raw artifact">
            <p className="whitespace-pre-wrap text-sm text-ink">{artifact.rawText ?? "No text content."}</p>
          </SectionCard>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard title="Metadata">
              <dl className="text-sm">
                <dt className="text-ink-muted">Artifact type</dt>
                <dd className="text-ink">{artifact.artifactType}</dd>
                <dt className="mt-2 text-ink-muted">MIME type</dt>
                <dd className="text-ink">{artifact.mimeType}</dd>
                <dt className="mt-2 text-ink-muted">Checksum (SHA-256)</dt>
                <dd className="break-all font-mono text-xs text-ink">{artifact.checksum}</dd>
                <dt className="mt-2 text-ink-muted">Received</dt>
                <dd className="text-ink">{new Date(artifact.receivedAt).toLocaleString()}</dd>
                <dt className="mt-2 text-ink-muted">Processing status</dt>
                <dd className="text-ink">{artifact.processingStatus}</dd>
              </dl>
            </SectionCard>

            <SectionCard title="Segments">
              {segments.length === 0 ? (
                <p className="text-sm text-ink-muted">No segments recorded for this artifact yet.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {segments.map((segment) => (
                    <li key={segment.id} className="border-b border-border pb-2 last:border-0">
                      <p className="font-medium text-ink">{formatLocator(segment.locator)}</p>
                      {segment.excerpt !== null ? <p className="text-ink-muted">{segment.excerpt}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Proposed observations">
              <p className="text-sm text-ink-muted">
                No observations yet — extraction has not run for this artifact (processing lands in a later wave).
              </p>
            </SectionCard>

            <SectionCard title="Entity-resolution candidates">
              <p className="text-sm text-ink-muted">
                No entity-resolution candidates yet — extraction has not run for this artifact.
              </p>
            </SectionCard>
          </div>

          <SectionCard title="Structured payload">
            <CopyableJson value={{ artifact, segments }} />
          </SectionCard>
        </>
      )}
    </WorkspaceShell>
  );
}
