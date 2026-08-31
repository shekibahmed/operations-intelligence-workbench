export type JsonValue =
  | boolean
  | null
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  activePackId: string | null;
  mode: "fixture" | "public-demo" | "private-pilot";
  createdAt: string;
  resetAt: string | null;
  expiresAt: string | null;
}

export interface SourceRecord {
  id: string;
  workspaceId: string;
  sourceType: string;
  name: string;
  configuration: Record<string, JsonValue>;
  createdAt: string;
}

export interface ArtifactRecord {
  id: string;
  workspaceId: string;
  sourceId: string;
  artifactType: string;
  mimeType: string;
  receivedAt: string;
  occurredAt: string | null;
  rawReference: string;
  rawText: string | null;
  checksum: string;
  metadata: Record<string, JsonValue>;
  processingStatus:
    | "received"
    | "processing"
    | "processed"
    | "needs-review"
    | "failed-retryable"
    | "failed-terminal";
}

export interface EntityRecord {
  id: string;
  workspaceId: string;
  entityType: string;
  displayName: string;
  externalReference: string | null;
  aliases: string[];
  attributes: Record<string, JsonValue>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntryRecord {
  id: string;
  workspaceId: string;
  occurredAt: string;
  action: string;
  actor: { type: "human" | "system" | "provider"; id: string };
  subject: { type: string; id: string };
  cause: string;
  data: Record<string, JsonValue>;
  previousEntryHash: string | null;
  entryHash: string;
}

export interface WorkspaceRepositoryPort {
  insert(value: WorkspaceRecord): Promise<WorkspaceRecord>;
  findById(workspaceId: string): Promise<WorkspaceRecord | null>;
  findBySlug(slug: string): Promise<WorkspaceRecord | null>;
  listExpired(before: string): Promise<WorkspaceRecord[]>;
  update(workspaceId: string, value: WorkspaceRecord): Promise<WorkspaceRecord | null>;
  delete(workspaceId: string): Promise<boolean>;
  clearForReset(workspaceId: string, auditEntry: AuditEntryRecord): Promise<boolean>;
}

interface InsertRepositoryPort<T> {
  insert(workspaceId: string, value: T): Promise<T>;
}

export interface AuditEntryRepositoryPort extends InsertRepositoryPort<AuditEntryRecord> {
  list(workspaceId: string): Promise<AuditEntryRecord[]>;
}

export interface SeedRepositoryPorts {
  sources: InsertRepositoryPort<SourceRecord>;
  artifacts: InsertRepositoryPort<ArtifactRecord>;
  entities: InsertRepositoryPort<EntityRecord>;
  auditEntries: AuditEntryRepositoryPort;
}

export interface ResetRepositoryPorts extends SeedRepositoryPorts {
  workspaces: WorkspaceRepositoryPort;
}

export interface SeedPack {
  directory: string;
  manifest: {
    id: string;
    version: string;
    defaultFixtureSet: "smoke" | "demo" | "edge-cases";
  };
}

export interface SeedFixtureArtifact {
  id: string;
  artifactType: string;
  mimeType: string;
  contentPath: string;
  sourceMetadata: Record<string, JsonValue>;
  sha256: string;
  content: Uint8Array;
}

export interface SeedFixtureSet {
  name: "smoke" | "demo" | "edge-cases";
  artifacts: SeedFixtureArtifact[];
  entities: readonly SeedEntityDefinition[];
}

export interface SeedEntityDefinition {
  id: string;
  entityType: string;
  displayName: string;
  externalReference: string | null;
  aliases: string[];
  attributes: Record<string, JsonValue>;
  status: string;
}

export type FixtureSetLoader<TPack extends SeedPack> = (
  pack: TPack,
  fixtureSetName: SeedFixtureSet["name"],
) => Promise<
  | { status: "loaded"; fixtureSet: SeedFixtureSet; warnings: unknown[] }
  | { status: "invalid"; errors: unknown[]; warnings: unknown[] }
>;
