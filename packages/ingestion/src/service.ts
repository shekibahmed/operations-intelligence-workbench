import { createHash, randomUUID } from "node:crypto";

import type { Artifact, ArtifactSegment, AuditEntry, JsonValue } from "@oiw/contracts";

import { CsvAdapter, FormatAdapterRegistry, segmentChecksum } from "./adapters.js";

interface ScopedInsertRepository<T> {
  insert(workspaceId: string, value: T): Promise<T>;
}

export interface IngestionRepositories {
  artifacts: ScopedInsertRepository<Artifact> & {
    list(workspaceId: string): Promise<Artifact[]>;
    updateProcessingStatus(
      workspaceId: string,
      artifactId: string,
      status: Artifact["processingStatus"],
    ): Promise<Artifact | null>;
  };
  artifactSegments: ScopedInsertRepository<ArtifactSegment> & {
    listByArtifact(workspaceId: string, artifactId: string): Promise<ArtifactSegment[]>;
  };
  auditEntries: ScopedInsertRepository<AuditEntry> & {
    list(workspaceId: string): Promise<AuditEntry[]>;
  };
}

export interface RawArtifactInput {
  workspaceId: string;
  sourceId: string;
  artifactType: string;
  mimeType: string;
  content: string | Uint8Array;
  rawReference: string;
  metadata?: Record<string, JsonValue>;
  receivedAt?: string;
  occurredAt?: string | null;
}

export interface IngestionResult {
  artifact: Artifact;
  segments: ArtifactSegment[];
  inserted: boolean;
  duplicateOfArtifactId: string | null;
}

function stableJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
    .join(",")}}`;
}

function auditHash(value: Omit<AuditEntry, "entryHash">): string {
  return createHash("sha256").update(stableJson(value as unknown as JsonValue)).digest("hex");
}

function nextAuditTimestamp(requested: string, entries: AuditEntry[]): string {
  const latest = entries.at(-1)?.occurredAt;
  if (latest === undefined || Date.parse(requested) > Date.parse(latest)) return requested;
  return new Date(Date.parse(latest) + 1).toISOString();
}

export async function appendArtifactAudit(
  repositories: Pick<IngestionRepositories, "auditEntries">,
  input: {
    workspaceId: string;
    artifactId: string;
    occurredAt: string;
    action: string;
    cause: string;
    data: Record<string, JsonValue>;
    actor?: AuditEntry["actor"];
  },
): Promise<AuditEntry> {
  const entries = await repositories.auditEntries.list(input.workspaceId);
  const entryWithoutHash: Omit<AuditEntry, "entryHash"> = {
    id: randomUUID(),
    workspaceId: input.workspaceId,
    occurredAt: nextAuditTimestamp(input.occurredAt, entries),
    action: input.action,
    actor: input.actor ?? { type: "system", id: "artifact-ingestion" },
    subject: { type: "artifact", id: input.artifactId },
    cause: input.cause,
    data: input.data,
    previousEntryHash: entries.at(-1)?.entryHash ?? null,
  };
  return repositories.auditEntries.insert(input.workspaceId, {
    ...entryWithoutHash,
    entryHash: auditHash(entryWithoutHash),
  });
}

function decodeContent(content: string | Uint8Array): { bytes: Uint8Array; rawText: string } {
  if (typeof content === "string") {
    return { bytes: new TextEncoder().encode(content), rawText: content };
  }
  try {
    return {
      bytes: content,
      rawText: new TextDecoder("utf-8", { fatal: true }).decode(content),
    };
  } catch {
    throw new Error("P0 ingestion accepts UTF-8 text payloads only");
  }
}

export class IngestionService {
  constructor(
    private readonly repositories: IngestionRepositories,
    private readonly adapters = new FormatAdapterRegistry(),
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async ingest(input: RawArtifactInput): Promise<IngestionResult> {
    const { bytes, rawText } = decodeContent(input.content);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const duplicate = (await this.repositories.artifacts.list(input.workspaceId)).find(
      (artifact) => artifact.checksum === checksum,
    );
    if (duplicate !== undefined) {
      await appendArtifactAudit(this.repositories, {
        workspaceId: input.workspaceId,
        artifactId: duplicate.id,
        occurredAt: this.clock().toISOString(),
        action: "artifact-duplicate-detected",
        cause: "An exact workspace-scoped checksum match already exists",
        data: {
          checksum,
          duplicateOfArtifactId: duplicate.id,
          duplicateRawReference: input.rawReference,
        },
      });
      return {
        artifact: duplicate,
        segments: await this.repositories.artifactSegments.listByArtifact(
          input.workspaceId,
          duplicate.id,
        ),
        inserted: false,
        duplicateOfArtifactId: duplicate.id,
      };
    }

    const now = input.receivedAt ?? this.clock().toISOString();
    const artifact: Artifact = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
      artifactType: input.artifactType,
      mimeType: input.mimeType,
      receivedAt: now,
      occurredAt: input.occurredAt ?? null,
      rawReference: input.rawReference,
      rawText,
      checksum,
      metadata: input.metadata ?? {},
      processingStatus: "received",
    };
    const inserted = await this.repositories.artifacts.insert(input.workspaceId, artifact);
    await appendArtifactAudit(this.repositories, {
      workspaceId: input.workspaceId,
      artifactId: inserted.id,
      occurredAt: now,
      action: "artifact-received",
      cause: "Raw input accepted for immutable artifact processing",
      data: { checksum, mimeType: input.mimeType, rawReference: input.rawReference },
    });

    try {
      const segments: ArtifactSegment[] = [];
      for (const draft of this.adapters.segment(inserted)) {
        const segment = await this.repositories.artifactSegments.insert(input.workspaceId, {
          id: randomUUID(),
          artifactId: inserted.id,
          locator: draft.locator,
          excerpt: draft.excerpt,
          checksum: segmentChecksum(draft.excerpt),
          createdAt: now,
        });
        segments.push(segment);
      }
      await appendArtifactAudit(this.repositories, {
        workspaceId: input.workspaceId,
        artifactId: inserted.id,
        occurredAt: now,
        action: "artifact-segmented",
        cause: "The selected format adapter created evidence coordinates",
        data: { adapterId: this.adapters.adapterFor(inserted).id, segmentCount: segments.length },
      });
      return { artifact: inserted, segments, inserted: true, duplicateOfArtifactId: null };
    } catch (error) {
      await this.repositories.artifacts.updateProcessingStatus(
        input.workspaceId,
        inserted.id,
        "failed-terminal",
      );
      await appendArtifactAudit(this.repositories, {
        workspaceId: input.workspaceId,
        artifactId: inserted.id,
        occurredAt: now,
        action: "artifact-ingestion-failed",
        cause: (error as Error).message,
        data: { retryable: false },
      });
      throw error;
    }
  }

  async ingestCsvRows(input: RawArtifactInput): Promise<IngestionResult[]> {
    const { rawText } = decodeContent(input.content);
    const rows = new CsvAdapter().splitRows(rawText);
    const results: IngestionResult[] = [];
    for (const [index, content] of rows.entries()) {
      results.push(
        await this.ingest({
          ...input,
          content,
          rawReference: `${input.rawReference}#row=${index}`,
          metadata: { ...(input.metadata ?? {}), csvRow: index },
        }),
      );
    }
    return results;
  }
}
