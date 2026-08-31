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
    alternativeCandidates: z
      .array(
        z
          .object({
            value: JsonValueSchema,
            confidence: z.number().min(0).max(1),
          })
          .strict(),
      )
      .optional(),
    derivation: z.enum(["machine", "rule", "human"]),
    evidenceStatus: z.enum(["supported", "insufficient-evidence", "negated"]),
    evidenceSegmentId: IdSchema.nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    extractor: ExtractorReferenceSchema.nullable(),
    insufficiencyReason: z.string().min(1).nullable(),
    reviewStatus: z.enum([
      "not-required",
      "pending",
      "accepted",
      "corrected",
      "rejected",
      "conflicting",
    ]),
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

export const MetricRecordTypeSchema = z.enum([
  "cases",
  "signals",
  "decisions",
  "action-items",
  "events",
  "artifacts",
]);

export const MetricFieldSchema = z.enum([
  "caseType",
  "status",
  "priority",
  "severity",
  "owner",
  "reEvaluationStatus",
  "signalType",
  "decisionType",
  "riskLevel",
  "approvalPolicyId",
  "actionType",
  "assignee",
  "eventType",
  "artifactType",
  "mimeType",
  "processingStatus",
]);

export const MetricTimestampFieldSchema = z.enum([
  "createdAt",
  "updatedAt",
  "dueAt",
  "decidedAt",
  "completedAt",
  "occurredAt",
  "recordedAt",
  "receivedAt",
]);

const METRIC_FIELDS_BY_RECORD_TYPE = {
  cases: ["caseType", "status", "priority", "severity", "owner", "reEvaluationStatus"],
  signals: ["signalType", "severity"],
  decisions: ["decisionType", "status", "riskLevel", "approvalPolicyId"],
  "action-items": ["actionType", "status", "assignee"],
  events: ["eventType", "reEvaluationStatus"],
  artifacts: ["artifactType", "mimeType", "processingStatus"],
} as const;

const METRIC_TIMESTAMPS_BY_RECORD_TYPE = {
  cases: ["createdAt", "updatedAt", "dueAt"],
  signals: ["createdAt"],
  decisions: ["createdAt", "decidedAt"],
  "action-items": ["createdAt", "dueAt", "completedAt"],
  events: ["occurredAt", "recordedAt"],
  artifacts: ["receivedAt", "occurredAt"],
} as const;

export const MetricFilterSchema = z.discriminatedUnion("operator", [
  z
    .object({
      field: MetricFieldSchema,
      operator: z.literal("equals"),
      value: z.string().min(1),
    })
    .strict(),
  z
    .object({
      field: MetricFieldSchema,
      operator: z.enum(["in", "not-in"]),
      values: z.array(z.string().min(1)).min(1),
    })
    .strict(),
]);

export const MetricTimeWindowSchema = z
  .object({
    field: MetricTimestampFieldSchema,
    from: TimestampSchema.optional(),
    to: TimestampSchema.optional(),
  })
  .strict()
  .refine((value) => value.from !== undefined || value.to !== undefined, {
    message: "A metric time window requires from or to",
  })
  .refine(
    (value) =>
      value.from === undefined || value.to === undefined || Date.parse(value.from) <= Date.parse(value.to),
    { message: "Metric time-window from must not be after to", path: ["from"] },
  );

export const MetricIllustrativeParametersSchema = z
  .object({
    summary: z.string().min(1),
    assumptions: z
      .record(z.string(), JsonValueSchema)
      .refine((value) => Object.keys(value).length > 0, "At least one illustrative assumption is required"),
  })
  .strict();

const MetricParameterBaseSchema = z.object({
  recordType: MetricRecordTypeSchema,
  timeWindow: MetricTimeWindowSchema.optional(),
  illustrative: MetricIllustrativeParametersSchema.optional(),
});

const CountMetricDefinitionSchema = z
  .object({
    aggregation: z.literal("count"),
    parameters: MetricParameterBaseSchema.strict(),
  })
  .strict();

const CountWhereMetricDefinitionSchema = z
  .object({
    aggregation: z.literal("count-where"),
    parameters: MetricParameterBaseSchema.extend({ filters: z.array(MetricFilterSchema).min(1) }).strict(),
  })
  .strict();

const CountByFieldMetricDefinitionSchema = z
  .object({
    aggregation: z.literal("count-by-field"),
    parameters: MetricParameterBaseSchema.extend({
      field: MetricFieldSchema,
      filters: z.array(MetricFilterSchema).optional(),
    }).strict(),
  })
  .strict();

const TrendOverTimeMetricDefinitionSchema = z
  .object({
    aggregation: z.literal("trend-over-time"),
    parameters: MetricParameterBaseSchema.extend({
      timestampField: MetricTimestampFieldSchema,
      bucket: z.enum(["day", "week", "month"]),
      filters: z.array(MetricFilterSchema).optional(),
    }).strict(),
  })
  .strict();

const SlaDerivedMetricDefinitionSchema = z
  .object({
    aggregation: z.literal("sla-derived"),
    parameters: MetricParameterBaseSchema.extend({
      recordType: z.enum(["cases", "action-items"]),
      atRiskWithinHours: z.number().nonnegative().finite(),
      filters: z.array(MetricFilterSchema).optional(),
    }).strict(),
  })
  .strict();

const MetricAggregationDefinitionSchema = z.discriminatedUnion("aggregation", [
  CountMetricDefinitionSchema,
  CountWhereMetricDefinitionSchema,
  CountByFieldMetricDefinitionSchema,
  TrendOverTimeMetricDefinitionSchema,
  SlaDerivedMetricDefinitionSchema,
]);

const MetricDefinitionBaseSchema = z.object({
  id: SlugSchema,
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  classification: z.enum(["observed", "calculated", "estimated", "hypothetical"]),
  format: z.enum(["number", "percentage", "duration", "currency", "text"]),
});

export const MetricDefinitionV15Schema = z
  .intersection(MetricDefinitionBaseSchema, MetricAggregationDefinitionSchema)
  .superRefine((definition, context) => {
    const parameters = definition.parameters;
    const allowedFields = new Set<string>(METRIC_FIELDS_BY_RECORD_TYPE[parameters.recordType]);
    const allowedTimestamps = new Set<string>(
      METRIC_TIMESTAMPS_BY_RECORD_TYPE[parameters.recordType],
    );
    const filters = "filters" in parameters ? parameters.filters ?? [] : [];
    filters.forEach((filter, index) => {
      if (!allowedFields.has(filter.field)) {
        context.addIssue({
          code: "custom",
          message: `Field ${filter.field} cannot filter ${parameters.recordType}`,
          path: ["parameters", "filters", index, "field"],
        });
      }
    });
    if ("field" in parameters && !allowedFields.has(parameters.field)) {
      context.addIssue({
        code: "custom",
        message: `Field ${parameters.field} cannot group ${parameters.recordType}`,
        path: ["parameters", "field"],
      });
    }
    if (
      "timestampField" in parameters &&
      !allowedTimestamps.has(parameters.timestampField)
    ) {
      context.addIssue({
        code: "custom",
        message: `Timestamp ${parameters.timestampField} cannot bucket ${parameters.recordType}`,
        path: ["parameters", "timestampField"],
      });
    }
    if (
      parameters.timeWindow !== undefined &&
      !allowedTimestamps.has(parameters.timeWindow.field)
    ) {
      context.addIssue({
        code: "custom",
        message: `Timestamp ${parameters.timeWindow.field} cannot window ${parameters.recordType}`,
        path: ["parameters", "timeWindow", "field"],
      });
    }
    if (definition.classification === "hypothetical" && parameters.illustrative === undefined) {
      context.addIssue({
        code: "custom",
        message: "Hypothetical metrics require illustrative assumptions",
        path: ["parameters", "illustrative"],
      });
    }
    if (definition.classification !== "hypothetical" && parameters.illustrative !== undefined) {
      context.addIssue({
        code: "custom",
        message: "Only hypothetical metrics may declare illustrative assumptions",
        path: ["parameters", "illustrative"],
      });
    }
  });

/**
 * Compatibility shape for pre-v1.5 in-process consumers. Scenario Pack loading
 * and metric evaluation accept only MetricDefinitionV15Schema.
 */
const LegacyMetricDefinitionSchema = z
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

export const MetricDefinitionSchema = z.union([
  MetricDefinitionV15Schema,
  LegacyMetricDefinitionSchema,
]);

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
export type MetricRecordType = z.infer<typeof MetricRecordTypeSchema>;
export type MetricField = z.infer<typeof MetricFieldSchema>;
export type MetricTimestampField = z.infer<typeof MetricTimestampFieldSchema>;
export type MetricFilter = z.infer<typeof MetricFilterSchema>;
export type MetricTimeWindow = z.infer<typeof MetricTimeWindowSchema>;
export type MetricIllustrativeParameters = z.infer<typeof MetricIllustrativeParametersSchema>;
export type MetricDefinitionV15 = z.infer<typeof MetricDefinitionV15Schema>;
export type MetricDefinition = z.infer<typeof MetricDefinitionSchema>;
export type AuditEntry = z.infer<typeof AuditEntrySchema>;
