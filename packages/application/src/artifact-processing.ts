import { createHash, randomUUID } from "node:crypto";

import type {
  Artifact,
  ArtifactSegment,
  AuditEntry,
  ExtractionRequest,
  ExtractionResult,
  JsonValue,
  Observation,
  ObservationSchemaDefinition,
  ProposedObservation,
} from "@oiw/contracts";

import { deterministicUuid, stableJson } from "./records.js";

interface ScopedRepository<T> {
  insert(workspaceId: string, value: T): Promise<T>;
  findById(workspaceId: string, id: string): Promise<T | null>;
}

export interface ArtifactProcessingRepositories {
  artifacts: ScopedRepository<Artifact> & {
    updateProcessingStatus(
      workspaceId: string,
      artifactId: string,
      status: Artifact["processingStatus"],
    ): Promise<Artifact | null>;
  };
  artifactSegments: ScopedRepository<ArtifactSegment> & {
    listByArtifact(workspaceId: string, artifactId: string): Promise<ArtifactSegment[]>;
  };
  observations: ScopedRepository<Observation> & {
    listByArtifact(workspaceId: string, artifactId: string): Promise<Observation[]>;
  };
  auditEntries: ScopedRepository<AuditEntry> & {
    list(workspaceId: string): Promise<AuditEntry[]>;
  };
}

export interface ArtifactAdapterPort {
  segment(artifact: Artifact): Array<{
    locator: ArtifactSegment["locator"];
    excerpt: string;
  }>;
  locate(artifact: Artifact, locator: ArtifactSegment["locator"]): string | null;
}

export interface IntelligenceProviderPort {
  extract(request: ExtractionRequest): Promise<ExtractionResult>;
}

export interface ObservationValidationResult {
  proposal: ProposedObservation;
  valid: boolean;
  issues: string[];
}

export type ExtractionValidationResult =
  | {
      validResult: true;
      result: ExtractionResult;
      observations: ObservationValidationResult[];
      issues: string[];
    }
  | {
      validResult: false;
      result: null;
      observations: [];
      issues: string[];
    };

export interface StructuredOutputValidatorPort {
  validate(
    result: unknown,
    expectedChecksum: string,
    catalogue: ReadonlyMap<string, ObservationSchemaDefinition>,
  ): ExtractionValidationResult;
}

export interface ObservationRoutingPolicyPort {
  reviewStatus(
    proposal: ProposedObservation,
    definition: ObservationSchemaDefinition | undefined,
    structurallyValid: boolean,
  ): "not-required" | "pending";
}

export interface ArtifactProcessingPack {
  manifest: { id: string; version: string };
  observationSchemas: ReadonlyMap<string, ObservationSchemaDefinition>;
}

export interface ArtifactProcessingPackResolver {
  resolve(workspaceId: string): Promise<ArtifactProcessingPack> | ArtifactProcessingPack;
}

export interface ArtifactProcessingResult {
  artifact: Artifact;
  observations: Observation[];
  validationIssues: string[];
  providerWarnings: ExtractionResult["warnings"];
  processingTrace: ExtractionResult["processingTrace"] | null;
  idempotent: boolean;
}

function auditHash(value: Omit<AuditEntry, "entryHash">): string {
  return createHash("sha256").update(stableJson(value as unknown as JsonValue)).digest("hex");
}

function nextAuditTimestamp(requested: string, entries: AuditEntry[]): string {
  const latest = entries.at(-1)?.occurredAt;
  if (latest === undefined || Date.parse(requested) > Date.parse(latest)) return requested;
  return new Date(Date.parse(latest) + 1).toISOString();
}

async function appendProcessingAudit(
  repositories: Pick<ArtifactProcessingRepositories, "auditEntries">,
  input: {
    workspaceId: string;
    artifactId: string;
    occurredAt: string;
    action: string;
    actor: AuditEntry["actor"];
    cause: string;
    data: Record<string, JsonValue>;
  },
): Promise<void> {
  const entries = await repositories.auditEntries.list(input.workspaceId);
  const withoutHash: Omit<AuditEntry, "entryHash"> = {
    id: randomUUID(),
    workspaceId: input.workspaceId,
    occurredAt: nextAuditTimestamp(input.occurredAt, entries),
    action: input.action,
    actor: input.actor,
    subject: { type: "artifact", id: input.artifactId },
    cause: input.cause,
    data: input.data,
    previousEntryHash: entries.at(-1)?.entryHash ?? null,
  };
  await repositories.auditEntries.insert(input.workspaceId, {
    ...withoutHash,
    entryHash: auditHash(withoutHash),
  });
}

function locatorsEqual(
  left: ArtifactSegment["locator"],
  right: ArtifactSegment["locator"],
): boolean {
  return stableJson(left as unknown as JsonValue) === stableJson(right as unknown as JsonValue);
}

function evidenceStatus(proposal: ProposedObservation): Observation["evidenceStatus"] {
  if (proposal.status === "extracted") return "supported";
  return proposal.status;
}

function evidenceMatchesSource(
  actual: string | null,
  expected: string,
  locator: ArtifactSegment["locator"],
): boolean {
  if (actual === null) return false;
  return locator.kind === "text-range" ? actual === expected : actual.includes(expected);
}

function isRetryable(error: unknown): boolean {
  return typeof error === "object" && error !== null && "retryable" in error
    ? Boolean((error as { retryable: unknown }).retryable)
    : true;
}

export class ArtifactProcessingService {
  constructor(
    private readonly repositories: ArtifactProcessingRepositories,
    private readonly adapters: ArtifactAdapterPort,
    private readonly provider: IntelligenceProviderPort,
    private readonly validator: StructuredOutputValidatorPort,
    private readonly routingPolicy: ObservationRoutingPolicyPort,
    private readonly packResolver: ArtifactProcessingPackResolver,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async processArtifact(workspaceId: string, artifactId: string): Promise<ArtifactProcessingResult> {
    const artifact = await this.repositories.artifacts.findById(workspaceId, artifactId);
    if (artifact === null) {
      throw new Error(`Artifact "${artifactId}" was not found in workspace "${workspaceId}"`);
    }
    const existingObservations = await this.repositories.observations.listByArtifact(
      workspaceId,
      artifactId,
    );
    if (artifact.processingStatus === "processed" || artifact.processingStatus === "needs-review") {
      return {
        artifact,
        observations: existingObservations,
        validationIssues: [],
        providerWarnings: [],
        processingTrace: null,
        idempotent: true,
      };
    }

    const startedAt = this.clock().toISOString();
    await this.repositories.artifacts.updateProcessingStatus(workspaceId, artifactId, "processing");
    await appendProcessingAudit(this.repositories, {
      workspaceId,
      artifactId,
      occurredAt: startedAt,
      action: "artifact-processing-started",
      actor: { type: "system", id: "artifact-processing" },
      cause: "Synchronous artifact processing requested",
      data: { checksum: artifact.checksum },
    });

    try {
      const existingSegments = await this.repositories.artifactSegments.listByArtifact(
        workspaceId,
        artifactId,
      );
      for (const draft of this.adapters.segment(artifact)) {
        if (
          existingSegments.some(
            (segment) =>
              locatorsEqual(segment.locator, draft.locator) && segment.excerpt === draft.excerpt,
          )
        ) {
          continue;
        }
        const id = deterministicUuid(
          workspaceId,
          `segment:${artifactId}:${stableJson(draft.locator as unknown as JsonValue)}:${draft.excerpt}`,
        );
        const segment = await this.repositories.artifactSegments.insert(workspaceId, {
          id,
          artifactId,
          locator: draft.locator,
          excerpt: draft.excerpt,
          checksum: createHash("sha256").update(draft.excerpt).digest("hex"),
          createdAt: startedAt,
        });
        existingSegments.push(segment);
      }

      const pack = await this.packResolver.resolve(workspaceId);
      const extraction = await this.provider.extract({
        artifact: {
          checksum: artifact.checksum,
          artifactType: artifact.artifactType,
          mimeType: artifact.mimeType,
          rawText: artifact.rawText,
          rawReference: artifact.rawReference,
          metadata: artifact.metadata,
        },
        observationSchema: Object.fromEntries(pack.observationSchemas) as Record<string, JsonValue>,
        context: {
          packId: pack.manifest.id,
          packVersion: pack.manifest.version,
          locale: "en",
          values: {},
        },
      });
      const validation = this.validator.validate(
        extraction,
        artifact.checksum,
        pack.observationSchemas,
      );
      if (!validation.validResult) {
        const updated = await this.repositories.artifacts.updateProcessingStatus(
          workspaceId,
          artifactId,
          "needs-review",
        );
        await appendProcessingAudit(this.repositories, {
          workspaceId,
          artifactId,
          occurredAt: this.clock().toISOString(),
          action: "extraction-rejected",
          actor: { type: "provider", id: "unknown-provider" },
          cause: "Provider output failed the shared ExtractionResult contract",
          data: { validationIssues: validation.issues },
        });
        return {
          artifact: updated ?? { ...artifact, processingStatus: "needs-review" },
          observations: existingObservations,
          validationIssues: validation.issues,
          providerWarnings: [],
          processingTrace: null,
          idempotent: false,
        };
      }

      const validationIssues = [...validation.issues];
      let requiresReview = validation.issues.length > 0;
      const observations = [...existingObservations];
      for (const [index, item] of validation.observations.entries()) {
        const observationId = deterministicUuid(workspaceId, `observation:${artifactId}:${index}`);
        if (await this.repositories.observations.findById(workspaceId, observationId)) continue;

        const firstEvidence = item.proposal.evidence[0];
        let evidenceSegmentId: string | null = null;
        let evidenceValid = true;
        if (firstEvidence !== undefined) {
          const actual = this.adapters.locate(artifact, firstEvidence.locator);
          evidenceValid = evidenceMatchesSource(actual, firstEvidence.excerpt, firstEvidence.locator);
          if (!evidenceValid) {
            validationIssues.push(
              `${item.proposal.schemaKey}: evidence excerpt does not match its source locator`,
            );
          } else {
            const matching = existingSegments.find(
              (segment) =>
                locatorsEqual(segment.locator, firstEvidence.locator) &&
                segment.excerpt === firstEvidence.excerpt,
            );
            if (matching !== undefined) {
              evidenceSegmentId = matching.id;
            } else {
              const id = deterministicUuid(
                workspaceId,
                `evidence:${artifactId}:${stableJson(firstEvidence.locator as unknown as JsonValue)}:${firstEvidence.excerpt}`,
              );
              const inserted = await this.repositories.artifactSegments.insert(workspaceId, {
                id,
                artifactId,
                locator: firstEvidence.locator,
                excerpt: firstEvidence.excerpt,
                checksum: createHash("sha256").update(firstEvidence.excerpt).digest("hex"),
                createdAt: startedAt,
              });
              existingSegments.push(inserted);
              evidenceSegmentId = inserted.id;
            }
          }
        }

        const structurallyValid = item.valid && evidenceValid;
        if (item.proposal.status !== "insufficient-evidence" && evidenceSegmentId === null) {
          requiresReview = true;
          validationIssues.push(
            `${item.proposal.schemaKey}: supported or negated output has no valid evidence segment`,
          );
          continue;
        }
        const definition = pack.observationSchemas.get(item.proposal.schemaKey);
        const reviewStatus = this.routingPolicy.reviewStatus(
          item.proposal,
          definition,
          structurallyValid,
        );
        if (reviewStatus === "pending") requiresReview = true;

        const observation: Observation = {
          id: observationId,
          artifactId,
          entityId: null,
          schemaKey: item.proposal.schemaKey,
          value: item.proposal.value,
          normalisedValue: item.proposal.normalisedValue,
          ...(item.proposal.status === "extracted" &&
          item.proposal.alternativeCandidates !== undefined
            ? { alternativeCandidates: item.proposal.alternativeCandidates }
            : {}),
          derivation: "machine",
          evidenceStatus: evidenceStatus(item.proposal),
          evidenceSegmentId,
          confidence: item.proposal.confidence,
          extractor: {
            id: validation.result.provider.providerId,
            version: validation.result.provider.providerVersion,
          },
          insufficiencyReason:
            item.proposal.status === "extracted" ? null : item.proposal.reason,
          reviewStatus,
          reviewedBy: null,
          reviewedAt: null,
          createdAt: new Date(Date.parse(startedAt) + index).toISOString(),
        };
        observations.push(await this.repositories.observations.insert(workspaceId, observation));
      }

      const processingStatus = requiresReview ? "needs-review" : "processed";
      const updated = await this.repositories.artifacts.updateProcessingStatus(
        workspaceId,
        artifactId,
        processingStatus,
      );
      await appendProcessingAudit(this.repositories, {
        workspaceId,
        artifactId,
        occurredAt: this.clock().toISOString(),
        action: "artifact-processing-completed",
        actor: { type: "provider", id: validation.result.provider.providerId },
        cause: requiresReview
          ? "Extraction completed with observations routed to review"
          : "Extraction completed and passed validation and confidence policy",
        data: {
          observationCount: observations.length,
          processingStatus,
          providerVersion: validation.result.provider.providerVersion,
          deterministic: validation.result.provider.deterministic,
          warningCount: validation.result.warnings.length,
          validationIssues,
        },
      });
      return {
        artifact: updated ?? { ...artifact, processingStatus },
        observations,
        validationIssues,
        providerWarnings: validation.result.warnings,
        processingTrace: validation.result.processingTrace,
        idempotent: false,
      };
    } catch (error) {
      const retryable = isRetryable(error);
      await this.repositories.artifacts.updateProcessingStatus(
        workspaceId,
        artifactId,
        retryable ? "failed-retryable" : "failed-terminal",
      );
      await appendProcessingAudit(this.repositories, {
        workspaceId,
        artifactId,
        occurredAt: this.clock().toISOString(),
        action: "artifact-processing-failed",
        actor: { type: "system", id: "artifact-processing" },
        cause: (error as Error).message,
        data: { retryable },
      });
      throw error;
    }
  }
}
