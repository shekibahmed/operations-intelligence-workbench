import { z } from "zod";

import {
  ChecksumSchema,
  IdSchema,
  JsonValueSchema,
  SlugSchema,
  TimestampSchema,
  VersionSchema,
} from "./common.js";

const AttributesSchema = z.record(z.string(), JsonValueSchema);

export const WorkspaceSchema = z
  .object({
    id: IdSchema,
    name: z.string().min(1).max(200),
    slug: SlugSchema,
    activePackId: SlugSchema.nullable(),
    mode: z.enum(["fixture", "public-demo", "private-pilot"]),
    createdAt: TimestampSchema,
    resetAt: TimestampSchema.nullable(),
    expiresAt: TimestampSchema.nullable(),
  })
  .strict();

export const SourceSchema = z
  .object({
    id: IdSchema,
    workspaceId: IdSchema,
    sourceType: SlugSchema,
    name: z.string().min(1).max(200),
    configuration: AttributesSchema,
    createdAt: TimestampSchema,
  })
  .strict();

export const ArtifactSchema = z
  .object({
    id: IdSchema,
    workspaceId: IdSchema,
    sourceId: IdSchema,
    artifactType: SlugSchema,
    mimeType: z.string().min(1).max(255),
    receivedAt: TimestampSchema,
    occurredAt: TimestampSchema.nullable(),
    rawReference: z.string().min(1),
    rawText: z.string().nullable(),
    checksum: ChecksumSchema,
    metadata: AttributesSchema,
    processingStatus: z.enum([
      "received",
      "processing",
      "processed",
      "needs-review",
      "failed-retryable",
      "failed-terminal",
    ]),
  })
  .strict();

export const ArtifactSegmentLocatorSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("text-range"),
      start: z.number().int().nonnegative(),
      end: z.number().int().positive(),
    })
    .strict()
    .refine((value) => value.end > value.start, {
      message: "Text range end must be greater than start",
      path: ["end"],
    }),
  z
    .object({
      kind: z.literal("page"),
      page: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("table-cell"),
      row: z.number().int().nonnegative(),
      column: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("json-path"),
      path: z.string().startsWith("$"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("attachment"),
      attachmentId: z.string().min(1),
    })
    .strict(),
]);

export const ArtifactSegmentSchema = z
  .object({
    id: IdSchema,
    artifactId: IdSchema,
    locator: ArtifactSegmentLocatorSchema,
    excerpt: z.string().nullable(),
    checksum: ChecksumSchema.nullable(),
    createdAt: TimestampSchema,
  })
  .strict();

export const EntitySchema = z
  .object({
    id: IdSchema,
    workspaceId: IdSchema,
    entityType: SlugSchema,
    displayName: z.string().min(1).max(300),
    externalReference: z.string().min(1).nullable(),
    aliases: z.array(z.string().min(1)),
    attributes: AttributesSchema,
    status: SlugSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

const ExtractorReferenceSchema = z
  .object({
    id: SlugSchema,
    version: VersionSchema,
  })
  .strict();

export const ObservationSchema = z
  .object({
    id: IdSchema,
    artifactId: IdSchema,
    entityId: IdSchema.nullable(),
    schemaKey: SlugSchema,
    value: JsonValueSchema.nullable(),
    normalisedValue: JsonValueSchema.nullable(),
    derivation: z.enum(["machine", "rule", "human"]),
    evidenceStatus: z.enum(["supported", "insufficient-evidence"]),
    evidenceSegmentId: IdSchema.nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    extractor: ExtractorReferenceSchema.nullable(),
    insufficiencyReason: z.string().min(1).nullable(),
    reviewStatus: z.enum(["not-required", "pending", "accepted", "corrected", "rejected"]),
    reviewedBy: z.string().min(1).nullable(),
    reviewedAt: TimestampSchema.nullable(),
    createdAt: TimestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.evidenceStatus === "insufficient-evidence") {
      if (value.value !== null) {
        context.addIssue({ code: "custom", message: "Insufficient evidence requires a null value", path: ["value"] });
      }
      if (value.insufficiencyReason === null) {
        context.addIssue({ code: "custom", message: "Insufficient evidence requires a reason", path: ["insufficiencyReason"] });
      }
    }

    if (value.derivation === "machine") {
      if (value.extractor === null) {
        context.addIssue({ code: "custom", message: "Machine-derived observations require extractor metadata", path: ["extractor"] });
      }
      if (value.confidence === null) {
        context.addIssue({ code: "custom", message: "Machine-derived observations require confidence", path: ["confidence"] });
      }
      if (value.evidenceStatus === "supported" && value.evidenceSegmentId === null) {
        context.addIssue({ code: "custom", message: "Supported machine observations require an evidence segment", path: ["evidenceSegmentId"] });
      }
    }
  });

export const OperationalEventSchema = z
  .object({
    id: IdSchema,
    workspaceId: IdSchema,
    eventType: SlugSchema,
    occurredAt: TimestampSchema,
    recordedAt: TimestampSchema,
    entityIds: z.array(IdSchema),
    observationIds: z.array(IdSchema).min(1),
    attributes: AttributesSchema,
    assembly: z
      .object({
        assemblerId: SlugSchema,
        assemblerVersion: VersionSchema,
      })
      .strict(),
    reEvaluationStatus: z.enum(["current", "required", "completed"]),
  })
  .strict();

export const SignalSchema = z
  .object({
    id: IdSchema,
    workspaceId: IdSchema,
    signalType: SlugSchema,
    severity: z.enum(["info", "low", "medium", "high", "critical"]),
    eventIds: z.array(IdSchema).min(1),
    evidenceSegmentIds: z.array(IdSchema).min(1),
    rule: z
      .object({
        id: SlugSchema,
        version: VersionSchema,
      })
      .strict(),
    rationale: z.string().min(1),
    createdAt: TimestampSchema,
  })
  .strict();

export const CaseSchema = z
  .object({
    id: IdSchema,
    workspaceId: IdSchema,
    caseType: SlugSchema,
    title: z.string().min(1).max(300),
    status: SlugSchema,
    priority: z.enum(["low", "normal", "high", "urgent"]),
    severity: z.enum(["info", "low", "medium", "high", "critical"]),
    owner: z.string().min(1).nullable(),
    dueAt: TimestampSchema.nullable(),
    relatedEntityIds: z.array(IdSchema),
    relatedEventIds: z.array(IdSchema),
    relatedSignalIds: z.array(IdSchema),
    closureRequirementIds: z.array(SlugSchema),
    reEvaluationStatus: z.enum(["current", "required", "completed"]),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

export const ActionItemSchema = z
  .object({
    id: IdSchema,
    workspaceId: IdSchema,
    caseId: IdSchema,
    actionType: SlugSchema,
    title: z.string().min(1).max(300),
    assignee: z.string().min(1).nullable(),
    status: z.enum(["open", "in-progress", "completed", "cancelled"]),
    dueAt: TimestampSchema.nullable(),
    completionEvidenceSegmentIds: z.array(IdSchema),
    completedAt: TimestampSchema.nullable(),
    createdAt: TimestampSchema,
  })
  .strict();

export const DecisionSchema = z
  .object({
    id: IdSchema,
    workspaceId: IdSchema,
    caseId: IdSchema,
    decisionType: SlugSchema,
    proposal: z.string().min(1),
    rationale: z.string().min(1),
    evidenceSegmentIds: z.array(IdSchema).min(1),
    riskLevel: z.enum(["low", "medium", "high", "critical"]),
    approvalPolicyId: SlugSchema,
    status: z.enum(["proposed", "awaiting-approval", "approved", "rejected", "more-information-required"]),
    createdAt: TimestampSchema,
    decidedAt: TimestampSchema.nullable(),
  })
  .strict();

export const ApprovalSchema = z
  .object({
    id: IdSchema,
    workspaceId: IdSchema,
    decisionId: IdSchema,
    approver: z.string().min(1),
    outcome: z.enum(["approved", "rejected", "more-information-required"]),
    comment: z.string().min(1).nullable(),
    approvedAt: TimestampSchema,
  })
  .strict();

export const MetricDefinitionSchema = z
  .object({
    id: SlugSchema,
    name: z.string().min(1).max(200),
    description: z.string().min(1),
    classification: z.enum(["observed", "calculated", "estimated", "hypothetical"]),
    aggregation: z.enum([
      "count-records",
      "count-by-field",
      "average-duration",
      "ratio",
      "time-series-count",
      "due-date-risk",
      "recent-activity",
    ]),
    parameters: AttributesSchema,
    format: z.enum(["number", "percentage", "duration", "currency", "text"]),
  })
  .strict();

export const AuditEntrySchema = z
  .object({
    id: IdSchema,
    workspaceId: IdSchema,
    occurredAt: TimestampSchema,
    action: SlugSchema,
    actor: z
      .object({
        type: z.enum(["human", "system", "provider"]),
        id: z.string().min(1),
      })
      .strict(),
    subject: z
      .object({
        type: SlugSchema,
        id: IdSchema,
      })
      .strict(),
    cause: z.string().min(1),
    data: AttributesSchema,
    previousEntryHash: ChecksumSchema.nullable(),
    entryHash: ChecksumSchema,
  })
  .strict();

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Artifact = z.infer<typeof ArtifactSchema>;
export type ArtifactSegment = z.infer<typeof ArtifactSegmentSchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type Observation = z.infer<typeof ObservationSchema>;
export type OperationalEvent = z.infer<typeof OperationalEventSchema>;
export type Signal = z.infer<typeof SignalSchema>;
export type Case = z.infer<typeof CaseSchema>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
export type Decision = z.infer<typeof DecisionSchema>;
export type Approval = z.infer<typeof ApprovalSchema>;
export type MetricDefinition = z.infer<typeof MetricDefinitionSchema>;
export type AuditEntry = z.infer<typeof AuditEntrySchema>;
