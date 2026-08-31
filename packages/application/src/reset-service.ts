import type {
  FixtureSetLoader,
  ResetRepositoryPorts,
  SeedFixtureSet,
  SeedPack,
  WorkspaceRecord,
} from "./ports.js";
import { createAuditEntry, latestAuditHash } from "./records.js";
import type { SeedResult, SeedService } from "./seed-service.js";
import { DEFAULT_GUEST_TTL_MS } from "./workspace-service.js";

export interface ResetServiceOptions {
  clock?: () => Date;
  guestTtlMs?: number;
}

export interface ResetResult extends SeedResult {
  workspace: WorkspaceRecord;
}

export class ResetService {
  private readonly clock: () => Date;
  private readonly guestTtlMs: number;

  constructor(
    private readonly repositories: ResetRepositoryPorts,
    private readonly seedService: SeedService,
    options: ResetServiceOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.guestTtlMs = options.guestTtlMs ?? DEFAULT_GUEST_TTL_MS;
    if (!Number.isFinite(this.guestTtlMs) || this.guestTtlMs <= 0) {
      throw new Error("Guest workspace TTL must be a positive number of milliseconds");
    }
  }

  async reset<TPack extends SeedPack>(
    workspace: WorkspaceRecord,
    pack: TPack,
    loadFixtureSet: FixtureSetLoader<TPack>,
    fixtureSetName: SeedFixtureSet["name"] = pack.manifest.defaultFixtureSet,
  ): Promise<ResetResult> {
    if (workspace.activePackId !== pack.manifest.id) {
      throw new Error(
        `Workspace pack "${workspace.activePackId ?? "none"}" does not match reset pack "${pack.manifest.id}"`,
      );
    }

    const prepared = await this.seedService.prepare(pack, loadFixtureSet, fixtureSetName);
    const resetAt = this.clock();
    const audits = await this.repositories.auditEntries.list(workspace.id);
    const resetAudit = createAuditEntry({
      workspaceId: workspace.id,
      occurredAt: resetAt.toISOString(),
      action: "workspace-reset",
      cause: `Restored the ${fixtureSetName} fixture set for ${pack.manifest.id}`,
      data: { packId: pack.manifest.id, fixtureSet: fixtureSetName },
      previousEntryHash: latestAuditHash(audits),
    });

    if (!(await this.repositories.workspaces.clearForReset(workspace.id, resetAudit))) {
      throw new Error(`Workspace no longer exists: ${workspace.id}`);
    }

    const updated = await this.repositories.workspaces.update(workspace.id, {
      ...workspace,
      resetAt: resetAt.toISOString(),
      expiresAt: new Date(resetAt.getTime() + this.guestTtlMs).toISOString(),
    });
    if (updated === null) throw new Error(`Workspace no longer exists: ${workspace.id}`);

    const seedOccurredAt = new Date(resetAt.getTime() + 1).toISOString();
    const seeded = await this.seedService.apply(updated, pack, prepared, seedOccurredAt);
    return { ...seeded, workspace: updated };
  }
}
