import type {
  ArtifactRecord,
  FixtureSetLoader,
  JsonValue,
  SeedFixtureArtifact,
  SeedFixtureSet,
  SeedPack,
  SeedRepositoryPorts,
  SourceRecord,
  WorkspaceRecord,
} from "./ports.js";
import { createAuditEntry, deterministicUuid, latestAuditHash, stableJson } from "./records.js";

export const DEMO_SEED_TIMESTAMP = "2026-01-01T00:00:00.000Z";

export interface SeedResult {
  fixtureSet: SeedFixtureSet["name"];
  sourceCount: number;
  artifactCount: number;
  warnings: unknown[];
}

export interface PreparedSeed {
  fixtureSet: SeedFixtureSet;
  warnings: unknown[];
}

export interface SeedOptions {
  fixtureSet?: SeedFixtureSet["name"];
  auditOccurredAt?: string;
}

function sourceKey(artifact: SeedFixtureArtifact): string {
  return `${artifact.artifactType}:${stableJson(artifact.sourceMetadata)}`;
}

function sourceName(artifact: SeedFixtureArtifact): string {
  const narrativeSource = artifact.sourceMetadata["narrativeSource"];
  return typeof narrativeSource === "string" && narrativeSource.length > 0
    ? narrativeSource
    : artifact.artifactType;
}

function decodeText(content: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(content);
  } catch {
    return null;
  }
}

function artifactMetadata(
  artifact: SeedFixtureArtifact,
  pack: SeedPack,
  fixtureSetName: SeedFixtureSet["name"],
): Record<string, JsonValue> {
  return {
    ...artifact.sourceMetadata,
    synthetic: true,
    fixtureId: artifact.id,
    fixtureSet: fixtureSetName,
    packId: pack.manifest.id,
    packVersion: pack.manifest.version,
  };
}

function formatLoadErrors(errors: unknown[]): string {
  return errors.map((error) => JSON.stringify(error)).join("; ");
}

export class SeedService {
  constructor(
    private readonly repositories: SeedRepositoryPorts,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async prepare<TPack extends SeedPack>(
    pack: TPack,
    loadFixtureSet: FixtureSetLoader<TPack>,
    fixtureSetName = pack.manifest.defaultFixtureSet,
  ): Promise<PreparedSeed> {
    const loaded = await loadFixtureSet(pack, fixtureSetName);
    if (loaded.status === "invalid") {
      throw new Error(`Fixture set "${fixtureSetName}" is invalid: ${formatLoadErrors(loaded.errors)}`);
    }
    return { fixtureSet: loaded.fixtureSet, warnings: loaded.warnings };
  }

  async seed<TPack extends SeedPack>(
    workspace: WorkspaceRecord,
    pack: TPack,
    loadFixtureSet: FixtureSetLoader<TPack>,
    options: SeedOptions = {},
  ): Promise<SeedResult> {
    const prepared = await this.prepare(
      pack,
      loadFixtureSet,
      options.fixtureSet ?? pack.manifest.defaultFixtureSet,
    );
    return this.apply(workspace, pack, prepared, options.auditOccurredAt);
  }

  async apply(
    workspace: WorkspaceRecord,
    pack: SeedPack,
    prepared: PreparedSeed,
    auditOccurredAt = this.clock().toISOString(),
  ): Promise<SeedResult> {
    if (workspace.activePackId !== pack.manifest.id) {
      throw new Error(
        `Workspace pack "${workspace.activePackId ?? "none"}" does not match seed pack "${pack.manifest.id}"`,
      );
    }

    const sourceByKey = new Map<string, SourceRecord>();
    for (const artifact of prepared.fixtureSet.artifacts) {
      const key = sourceKey(artifact);
      if (sourceByKey.has(key)) continue;
      sourceByKey.set(key, {
        id: deterministicUuid(workspace.id, `source:${key}`),
        workspaceId: workspace.id,
        sourceType: artifact.artifactType,
        name: sourceName(artifact),
        configuration: artifact.sourceMetadata,
        createdAt: DEMO_SEED_TIMESTAMP,
      });
    }

    const sources = [...sourceByKey.entries()].sort(([left], [right]) => left.localeCompare(right));
    for (const [, source] of sources) {
      await this.repositories.sources.insert(workspace.id, source);
    }

    for (const artifact of prepared.fixtureSet.artifacts) {
      const source = sourceByKey.get(sourceKey(artifact));
      if (source === undefined) throw new Error(`No source planned for fixture ${artifact.id}`);
      const record: ArtifactRecord = {
        id: deterministicUuid(workspace.id, `artifact:${artifact.id}`),
        workspaceId: workspace.id,
        sourceId: source.id,
        artifactType: artifact.artifactType,
        mimeType: artifact.mimeType,
        receivedAt: DEMO_SEED_TIMESTAMP,
        occurredAt: null,
        rawReference: `fixture://${pack.manifest.id}/${pack.manifest.version}/${prepared.fixtureSet.name}/${artifact.id}`,
        rawText: decodeText(artifact.content),
        checksum: artifact.sha256,
        metadata: artifactMetadata(artifact, pack, prepared.fixtureSet.name),
        processingStatus: "received",
      };
      await this.repositories.artifacts.insert(workspace.id, record);
    }

    const audits = await this.repositories.auditEntries.list(workspace.id);
    await this.repositories.auditEntries.insert(
      workspace.id,
      createAuditEntry({
        workspaceId: workspace.id,
        occurredAt: auditOccurredAt,
        action: "workspace-seeded",
        cause: `Loaded the ${prepared.fixtureSet.name} fixture set for ${pack.manifest.id}`,
        data: {
          packId: pack.manifest.id,
          packVersion: pack.manifest.version,
          fixtureSet: prepared.fixtureSet.name,
          sourceCount: sources.length,
          artifactCount: prepared.fixtureSet.artifacts.length,
        },
        previousEntryHash: latestAuditHash(audits),
      }),
    );

    return {
      fixtureSet: prepared.fixtureSet.name,
      sourceCount: sources.length,
      artifactCount: prepared.fixtureSet.artifacts.length,
      warnings: prepared.warnings,
    };
  }
}
