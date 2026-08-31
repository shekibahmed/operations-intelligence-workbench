import { randomUUID } from "node:crypto";

import type { WorkspaceRecord, WorkspaceRepositoryPort } from "./ports.js";

export const DEFAULT_GUEST_TTL_MS = 24 * 60 * 60 * 1_000;

export interface WorkspaceServiceOptions {
  clock?: () => Date;
  createId?: () => string;
  guestTtlMs?: number;
}

export interface CreateGuestWorkspaceOptions {
  slug?: string;
  name?: string;
  ttlMs?: number;
}

function ensurePositiveTtl(ttlMs: number): void {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new Error("Guest workspace TTL must be a positive number of milliseconds");
  }
}

function defaultSlug(packId: string): string {
  return `${packId}-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export class WorkspaceService {
  private readonly clock: () => Date;
  private readonly createId: () => string;
  private readonly guestTtlMs: number;

  constructor(
    private readonly workspaces: WorkspaceRepositoryPort,
    options: WorkspaceServiceOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.createId = options.createId ?? randomUUID;
    this.guestTtlMs = options.guestTtlMs ?? DEFAULT_GUEST_TTL_MS;
    ensurePositiveTtl(this.guestTtlMs);
  }

  async createGuestWorkspace(
    packId: string,
    options: CreateGuestWorkspaceOptions = {},
  ): Promise<WorkspaceRecord> {
    const now = this.clock();
    const ttlMs = options.ttlMs ?? this.guestTtlMs;
    ensurePositiveTtl(ttlMs);

    const slug = options.slug ?? defaultSlug(packId);
    if (await this.workspaces.findBySlug(slug)) {
      throw new Error(`Workspace slug already exists: ${slug}`);
    }

    return this.workspaces.insert({
      id: this.createId(),
      name: options.name ?? `${packId} demo`,
      slug,
      activePackId: packId,
      mode: "public-demo",
      createdAt: now.toISOString(),
      resetAt: null,
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    });
  }

  async cleanupExpiredGuestWorkspaces(before = this.clock().toISOString()): Promise<string[]> {
    const expired = await this.workspaces.listExpired(before);
    const deleted: string[] = [];

    for (const workspace of expired) {
      if (workspace.mode !== "public-demo") continue;
      if (await this.workspaces.delete(workspace.id)) deleted.push(workspace.id);
    }

    return deleted;
  }
}
