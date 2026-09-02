import { describe, expect, it, vi } from "vitest";
import type { AuditEntry, Workspace } from "@oiw/contracts";
import type { PersistenceRepositories } from "@oiw/persistence";

import { handleExportDownload } from "@/lib/server/export-download";
import { GuestRateLimitError } from "@/lib/server/rate-limit";

const workspaceAId = "10000000-0000-4000-8000-000000000001";
const workspaceBId = "10000000-0000-4000-8000-000000000002";

function workspace(id: string, slug: string): Workspace {
  return {
    id,
    slug,
    name: "Synthetic workspace",
    activePackId: "test-pack",
    mode: "public-demo",
    createdAt: "2026-09-02T00:00:00.000Z",
    resetAt: null,
    expiresAt: "2099-09-02T00:00:00.000Z",
  };
}

function fakeRepositories(candidate: Workspace): {
  repositories: PersistenceRepositories;
  audits: AuditEntry[];
} {
  const audits: AuditEntry[] = [];
  const empty = { list: async () => [] };
  return {
    repositories: {
      workspaces: { findBySlug: async (slug: string) => (slug === candidate.slug ? candidate : null) },
      cases: empty,
      signals: empty,
      actionItems: empty,
      decisions: empty,
      approvals: empty,
      auditEntries: {
        list: async (workspaceId: string) => audits.filter((entry) => entry.workspaceId === workspaceId),
        insert: async (_workspaceId: string, entry: AuditEntry) => {
          audits.push(entry);
          return entry;
        },
      },
    } as unknown as PersistenceRepositories,
    audits,
  };
}

function session(workspaceId: string) {
  return {
    version: 1 as const,
    sessionId: "20000000-0000-4000-8000-000000000001",
    workspaceId,
    issuedAt: 1,
    expiresAt: 4_102_444_800,
  };
}

describe("export download security boundary", () => {
  it("rejects a cross-workspace export before rate limiting, querying data or appending audit", async () => {
    const candidate = workspace(workspaceBId, "workspace-b");
    const { repositories, audits } = fakeRepositories(candidate);
    const enforceRateLimit = vi.fn();

    const response = await handleExportDownload("workspace-b", "cases", "json", {
      repositories: () => repositories,
      readSessionPayload: async () => session(workspaceAId),
      enforceRateLimit,
      now: () => new Date("2026-09-02T00:00:00.000Z"),
    });

    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(workspaceBId);
    expect(enforceRateLimit).not.toHaveBeenCalled();
    expect(audits).toHaveLength(0);
  });

  it("returns 429 with retry guidance and creates no export audit when the limiter denies", async () => {
    const candidate = workspace(workspaceAId, "workspace-a");
    const { repositories, audits } = fakeRepositories(candidate);

    const response = await handleExportDownload("workspace-a", "cases", "csv", {
      repositories: () => repositories,
      readSessionPayload: async () => session(workspaceAId),
      enforceRateLimit: async () => {
        throw new GuestRateLimitError(5_000);
      },
      now: () => new Date("2026-09-02T00:00:00.000Z"),
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("5");
    await expect(response.json()).resolves.toEqual({ error: "Too many requests. Try again in 5 seconds." });
    expect(audits).toHaveLength(0);
  });

  it("audits an authorised export and streams safe attachment headers", async () => {
    const candidate = workspace(workspaceAId, "Synthetic Workspace / Demo");
    const { repositories, audits } = fakeRepositories(candidate);
    const enforceRateLimit = vi.fn(async () => undefined);

    const response = await handleExportDownload(candidate.slug, "audit", "json", {
      repositories: () => repositories,
      readSessionPayload: async () => session(workspaceAId),
      enforceRateLimit,
      now: () => new Date("2026-09-02T00:00:00.000Z"),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="audit-synthetic-workspace-demo.json"',
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-synthetic-data")).toBe("true");
    expect(enforceRateLimit).toHaveBeenCalledWith("export", candidate);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      action: "export",
      workspaceId: workspaceAId,
      data: { dataset: "audit", format: "json", syntheticDataOnly: true },
    });
    const payload = (await response.json()) as { records: AuditEntry[] };
    expect(payload.records).toHaveLength(1);
    expect(payload.records[0]?.action).toBe("export");
  });
});
