import { describe, expect, it } from "vitest";

import type { AuditEntryRecord, WorkspaceRecord, WorkspaceRepositoryPort } from "../src/ports.js";
import { WorkspaceService } from "../src/workspace-service.js";

class MemoryWorkspaceRepository implements WorkspaceRepositoryPort {
  readonly records = new Map<string, WorkspaceRecord>();
  readonly deleted: string[] = [];

  async insert(value: WorkspaceRecord): Promise<WorkspaceRecord> {
    this.records.set(value.id, value);
    return value;
  }

  async findById(id: string): Promise<WorkspaceRecord | null> {
    return this.records.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<WorkspaceRecord | null> {
    return [...this.records.values()].find((workspace) => workspace.slug === slug) ?? null;
  }

  async listExpired(before: string): Promise<WorkspaceRecord[]> {
    return [...this.records.values()].filter(
      (workspace) => workspace.expiresAt !== null && workspace.expiresAt <= before,
    );
  }

  async update(id: string, value: WorkspaceRecord): Promise<WorkspaceRecord | null> {
    if (!this.records.has(id)) return null;
    this.records.set(id, value);
    return value;
  }

  async delete(id: string): Promise<boolean> {
    if (!this.records.delete(id)) return false;
    this.deleted.push(id);
    return true;
  }

  async clearForReset(_id: string, _audit: AuditEntryRecord): Promise<boolean> {
    return false;
  }
}

const now = new Date("2026-08-31T10:00:00.000Z");

describe("WorkspaceService", () => {
  it("creates an isolated expiring public-demo workspace for a pack", async () => {
    const repository = new MemoryWorkspaceRepository();
    const service = new WorkspaceService(repository, {
      clock: () => now,
      createId: () => "11111111-1111-4111-8111-111111111111",
      guestTtlMs: 3_600_000,
    });

    await expect(
      service.createGuestWorkspace("asset-reliability", {
        slug: "asset-reliability-demo-one",
        name: "Asset Reliability Demo",
      }),
    ).resolves.toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Asset Reliability Demo",
      slug: "asset-reliability-demo-one",
      activePackId: "asset-reliability",
      mode: "public-demo",
      createdAt: "2026-08-31T10:00:00.000Z",
      resetAt: null,
      expiresAt: "2026-08-31T11:00:00.000Z",
    });
  });

  it("refuses a duplicate slug before persistence", async () => {
    const repository = new MemoryWorkspaceRepository();
    const service = new WorkspaceService(repository, { clock: () => now });
    await service.createGuestWorkspace("asset-reliability", { slug: "shared-demo" });

    await expect(
      service.createGuestWorkspace("asset-reliability", { slug: "shared-demo" }),
    ).rejects.toThrow("Workspace slug already exists");
  });

  it("deletes only expired guest workspaces", async () => {
    const repository = new MemoryWorkspaceRepository();
    const guestId = "11111111-1111-4111-8111-111111111111";
    const privateId = "22222222-2222-4222-8222-222222222222";
    const activeId = "33333333-3333-4333-8333-333333333333";
    for (const workspace of [
      { id: guestId, mode: "public-demo" as const, expiresAt: "2026-08-31T09:00:00.000Z" },
      { id: privateId, mode: "private-pilot" as const, expiresAt: "2026-08-31T09:00:00.000Z" },
      { id: activeId, mode: "public-demo" as const, expiresAt: "2026-08-31T11:00:00.000Z" },
    ]) {
      repository.records.set(workspace.id, {
        ...workspace,
        name: "Workspace",
        slug: `workspace-${workspace.id[0]}`,
        activePackId: "asset-reliability",
        createdAt: "2026-08-30T10:00:00.000Z",
        resetAt: null,
      });
    }

    const service = new WorkspaceService(repository, { clock: () => now });
    await expect(service.cleanupExpiredGuestWorkspaces()).resolves.toEqual([guestId]);
    expect(repository.deleted).toEqual([guestId]);
    expect(repository.records.has(privateId)).toBe(true);
    expect(repository.records.has(activeId)).toBe(true);
  });
});
