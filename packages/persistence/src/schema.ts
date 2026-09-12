import type {
  ArtifactSegment,
  AuditEntry,
  JsonValue,
  Observation,
} from "@oiw/contracts";
import {
  check,
  doublePrecision,
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

type Attributes = Record<string, JsonValue>;

const scopedUnique = (name: string) => unique(name);
const scopedIndex = (name: string) => index(name);

export const workspaceModeEnum = pgEnum("workspace_mode", [
  "fixture",
  "public-demo",
  "private-pilot",
]);
export const artifactProcessingStatusEnum = pgEnum("artifact_processing_status", [
  "received",
  "processing",
  "processed",
  "needs-review",
  "failed-retryable",
  "failed-terminal",
]);
export const observationDerivationEnum = pgEnum("observation_derivation", [
  "machine",
  "rule",
  "human",
]);
export const evidenceStatusEnum = pgEnum("evidence_status", [
  "supported",
  "insufficient-evidence",
  "negated",
]);
export const observationReviewStatusEnum = pgEnum("observation_review_status", [
  "not-required",
  "pending",
  "accepted",
  "corrected",
  "rejected",
  "conflicting",
]);
export const reEvaluationStatusEnum = pgEnum("re_evaluation_status", [
  "current",
  "required",
  "completed",
]);
export const severityEnum = pgEnum("severity", [
  "info",
  "low",
  "medium",
  "high",
  "critical",
]);
export const priorityEnum = pgEnum("priority", ["low", "normal", "high", "urgent"]);
export const actionStatusEnum = pgEnum("action_status", [
  "open",
  "in-progress",
  "completed",
  "cancelled",
]);
export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high", "critical"]);
export const decisionStatusEnum = pgEnum("decision_status", [
  "proposed",
  "awaiting-approval",
  "approved",
  "rejected",
  "more-information-required",
]);
export const approvalOutcomeEnum = pgEnum("approval_outcome", [
  "approved",
  "rejected",
  "more-information-required",
]);

const zonedTimestamp = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "string" });

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    activePackId: text("active_pack_id"),
    mode: workspaceModeEnum("mode").notNull(),
    createdAt: zonedTimestamp("created_at").notNull(),
    resetAt: zonedTimestamp("reset_at"),
    expiresAt: zonedTimestamp("expires_at"),
  },
  (table) => [unique("workspaces_slug_unique").on(table.slug)],
);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    name: text("name").notNull(),
    configuration: jsonb("configuration").$type<Attributes>().notNull(),
    createdAt: zonedTimestamp("created_at").notNull(),
  },
  (table) => [
    scopedUnique("sources_id_workspace_unique").on(table.id, table.workspaceId),
    scopedIndex("sources_workspace_idx").on(table.workspaceId),
  ],
);

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").notNull(),
    artifactType: text("artifact_type").notNull(),
    mimeType: text("mime_type").notNull(),
    receivedAt: zonedTimestamp("received_at").notNull(),
    occurredAt: zonedTimestamp("occurred_at"),
    rawReference: text("raw_reference").notNull(),
    rawText: text("raw_text"),
    checksum: text("checksum").notNull(),
    metadata: jsonb("metadata").$type<Attributes>().notNull(),
    processingStatus: artifactProcessingStatusEnum("processing_status").notNull(),
  },
  (table) => [
    scopedUnique("artifacts_id_workspace_unique").on(table.id, table.workspaceId),
    unique("artifacts_workspace_checksum_unique").on(table.workspaceId, table.checksum),
    scopedIndex("artifacts_workspace_idx").on(table.workspaceId),
    foreignKey({
      name: "artifacts_source_workspace_fk",
      columns: [table.sourceId, table.workspaceId],
      foreignColumns: [sources.id, sources.workspaceId],
    }).onDelete("cascade"),
  ],
);

export const artifactSegments = pgTable(
  "artifact_segments",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    artifactId: uuid("artifact_id").notNull(),
    locator: jsonb("locator").$type<ArtifactSegment["locator"]>().notNull(),
    excerpt: text("excerpt"),
    checksum: text("checksum"),
    createdAt: zonedTimestamp("created_at").notNull(),
  },
  (table) => [
    scopedUnique("artifact_segments_id_workspace_unique").on(table.id, table.workspaceId),
    scopedIndex("artifact_segments_workspace_idx").on(table.workspaceId),
    index("artifact_segments_artifact_idx").on(table.workspaceId, table.artifactId),
    foreignKey({
      name: "artifact_segments_artifact_workspace_fk",
      columns: [table.artifactId, table.workspaceId],
      foreignColumns: [artifacts.id, artifacts.workspaceId],
    }).onDelete("cascade"),
  ],
);

export const entities = pgTable(
  "entities",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    displayName: text("display_name").notNull(),
    externalReference: text("external_reference"),
    aliases: jsonb("aliases").$type<string[]>().notNull(),
    attributes: jsonb("attributes").$type<Attributes>().notNull(),
    status: text("status").notNull(),
    createdAt: zonedTimestamp("created_at").notNull(),
    updatedAt: zonedTimestamp("updated_at").notNull(),
  },
  (table) => [
    scopedUnique("entities_id_workspace_unique").on(table.id, table.workspaceId),
    unique("entities_workspace_external_reference_unique").on(
      table.workspaceId,
      table.entityType,
      table.externalReference,
    ),
    scopedIndex("entities_workspace_idx").on(table.workspaceId),
  ],
);

export const observations = pgTable(
  "observations",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    artifactId: uuid("artifact_id").notNull(),
    entityId: uuid("entity_id"),
    schemaKey: text("schema_key").notNull(),
    value: jsonb("value").$type<JsonValue | null>(),
    normalisedValue: jsonb("normalised_value").$type<JsonValue | null>(),
    alternativeCandidates: jsonb("alternative_candidates").$type<
      Observation["alternativeCandidates"]
    >(),
    derivation: observationDerivationEnum("derivation").notNull(),
    evidenceStatus: evidenceStatusEnum("evidence_status").notNull(),
    evidenceSegmentId: uuid("evidence_segment_id"),
    confidence: doublePrecision("confidence"),
    extractor: jsonb("extractor").$type<Observation["extractor"]>(),
    insufficiencyReason: text("insufficiency_reason"),
    reviewStatus: observationReviewStatusEnum("review_status").notNull(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: zonedTimestamp("reviewed_at"),
    createdAt: zonedTimestamp("created_at").notNull(),
  },
  (table) => [
    scopedUnique("observations_id_workspace_unique").on(table.id, table.workspaceId),
    scopedIndex("observations_workspace_idx").on(table.workspaceId),
    index("observations_artifact_idx").on(table.workspaceId, table.artifactId),
    foreignKey({
      name: "observations_artifact_workspace_fk",
      columns: [table.artifactId, table.workspaceId],
      foreignColumns: [artifacts.id, artifacts.workspaceId],
    }).onDelete("cascade"),
    foreignKey({
      name: "observations_entity_workspace_fk",
      columns: [table.entityId, table.workspaceId],
      foreignColumns: [entities.id, entities.workspaceId],
    }).onDelete("restrict"),
    foreignKey({
      name: "observations_evidence_workspace_fk",
      columns: [table.evidenceSegmentId, table.workspaceId],
      foreignColumns: [artifactSegments.id, artifactSegments.workspaceId],
    }).onDelete("restrict"),
    check("observations_confidence_range", sql`${table.confidence} between 0 and 1`),
    check(
      "observations_insufficient_evidence_shape",
      sql`${table.evidenceStatus} <> 'insufficient-evidence' OR (${table.value} IS NULL AND ${table.insufficiencyReason} IS NOT NULL)`,
    ),
  ],
);

export const observationRevisions = pgTable(
  "observation_revisions",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    observationId: uuid("observation_id").notNull(),
    snapshot: jsonb("snapshot").$type<Observation>().notNull(),
    recordedAt: zonedTimestamp("recorded_at").notNull(),
  },
  (table) => [
    scopedIndex("observation_revisions_workspace_idx").on(table.workspaceId),
    index("observation_revisions_observation_idx").on(table.workspaceId, table.observationId),
    foreignKey({
      columns: [table.observationId, table.workspaceId],
      foreignColumns: [observations.id, observations.workspaceId],
    }).onDelete("cascade"),
  ],
);

export const operationalEvents = pgTable(
  "operational_events",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    occurredAt: zonedTimestamp("occurred_at").notNull(),
    recordedAt: zonedTimestamp("recorded_at").notNull(),
    attributes: jsonb("attributes").$type<Attributes>().notNull(),
    assemblerId: text("assembler_id").notNull(),
    assemblerVersion: text("assembler_version").notNull(),
    reEvaluationStatus: reEvaluationStatusEnum("re_evaluation_status").notNull(),
  },
  (table) => [
    scopedUnique("operational_events_id_workspace_unique").on(table.id, table.workspaceId),
    scopedIndex("operational_events_workspace_idx").on(table.workspaceId),
  ],
);

export const eventEntities = pgTable(
  "event_entities",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").notNull(),
    entityId: uuid("entity_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.eventId, table.entityId] }),
    scopedIndex("event_entities_workspace_idx").on(table.workspaceId),
    foreignKey({
      columns: [table.eventId, table.workspaceId],
      foreignColumns: [operationalEvents.id, operationalEvents.workspaceId],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.entityId, table.workspaceId],
      foreignColumns: [entities.id, entities.workspaceId],
    }).onDelete("restrict"),
  ],
);

export const eventObservations = pgTable(
  "event_observations",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").notNull(),
    observationId: uuid("observation_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.eventId, table.observationId] }),
    scopedIndex("event_observations_workspace_idx").on(table.workspaceId),
    foreignKey({
      columns: [table.eventId, table.workspaceId],
      foreignColumns: [operationalEvents.id, operationalEvents.workspaceId],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.observationId, table.workspaceId],
      foreignColumns: [observations.id, observations.workspaceId],
    }).onDelete("restrict"),
  ],
);

export const signals = pgTable(
  "signals",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    signalType: text("signal_type").notNull(),
    severity: severityEnum("severity").notNull(),
    ruleId: text("rule_id").notNull(),
    ruleVersion: text("rule_version").notNull(),
    rationale: text("rationale").notNull(),
    createdAt: zonedTimestamp("created_at").notNull(),
  },
  (table) => [
    scopedUnique("signals_id_workspace_unique").on(table.id, table.workspaceId),
    scopedIndex("signals_workspace_idx").on(table.workspaceId),
  ],
);

export const signalEvents = pgTable(
  "signal_events",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    signalId: uuid("signal_id").notNull(),
    eventId: uuid("event_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.signalId, table.eventId] }),
    scopedIndex("signal_events_workspace_idx").on(table.workspaceId),
    foreignKey({ columns: [table.signalId, table.workspaceId], foreignColumns: [signals.id, signals.workspaceId] }).onDelete("cascade"),
    foreignKey({ columns: [table.eventId, table.workspaceId], foreignColumns: [operationalEvents.id, operationalEvents.workspaceId] }).onDelete("restrict"),
  ],
);

export const signalEvidenceSegments = pgTable(
  "signal_evidence_segments",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    signalId: uuid("signal_id").notNull(),
    artifactSegmentId: uuid("artifact_segment_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.signalId, table.artifactSegmentId] }),
    scopedIndex("signal_evidence_segments_workspace_idx").on(table.workspaceId),
    foreignKey({ columns: [table.signalId, table.workspaceId], foreignColumns: [signals.id, signals.workspaceId] }).onDelete("cascade"),
    foreignKey({ columns: [table.artifactSegmentId, table.workspaceId], foreignColumns: [artifactSegments.id, artifactSegments.workspaceId] }).onDelete("restrict"),
  ],
);

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    caseType: text("case_type").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull(),
    priority: priorityEnum("priority").notNull(),
    severity: severityEnum("severity").notNull(),
    owner: text("owner"),
    dueAt: zonedTimestamp("due_at"),
    closureRequirementIds: jsonb("closure_requirement_ids").$type<string[]>().notNull(),
    reEvaluationStatus: reEvaluationStatusEnum("re_evaluation_status").notNull(),
    createdAt: zonedTimestamp("created_at").notNull(),
    updatedAt: zonedTimestamp("updated_at").notNull(),
  },
  (table) => [
    scopedUnique("cases_id_workspace_unique").on(table.id, table.workspaceId),
    scopedIndex("cases_workspace_idx").on(table.workspaceId),
  ],
);

export const caseEntities = pgTable(
  "case_entities",
  {
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    caseId: uuid("case_id").notNull(),
    entityId: uuid("entity_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.caseId, table.entityId] }),
    scopedIndex("case_entities_workspace_idx").on(table.workspaceId),
    foreignKey({ columns: [table.caseId, table.workspaceId], foreignColumns: [cases.id, cases.workspaceId] }).onDelete("cascade"),
    foreignKey({ columns: [table.entityId, table.workspaceId], foreignColumns: [entities.id, entities.workspaceId] }).onDelete("restrict"),
  ],
);

export const caseEvents = pgTable(
  "case_events",
  {
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    caseId: uuid("case_id").notNull(),
    eventId: uuid("event_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.caseId, table.eventId] }),
    scopedIndex("case_events_workspace_idx").on(table.workspaceId),
    foreignKey({ columns: [table.caseId, table.workspaceId], foreignColumns: [cases.id, cases.workspaceId] }).onDelete("cascade"),
    foreignKey({ columns: [table.eventId, table.workspaceId], foreignColumns: [operationalEvents.id, operationalEvents.workspaceId] }).onDelete("restrict"),
  ],
);

export const caseSignals = pgTable(
  "case_signals",
  {
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    caseId: uuid("case_id").notNull(),
    signalId: uuid("signal_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.caseId, table.signalId] }),
    scopedIndex("case_signals_workspace_idx").on(table.workspaceId),
    foreignKey({ columns: [table.caseId, table.workspaceId], foreignColumns: [cases.id, cases.workspaceId] }).onDelete("cascade"),
    foreignKey({ columns: [table.signalId, table.workspaceId], foreignColumns: [signals.id, signals.workspaceId] }).onDelete("restrict"),
  ],
);

export const actionItems = pgTable(
  "action_items",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    caseId: uuid("case_id").notNull(),
    actionType: text("action_type").notNull(),
    title: text("title").notNull(),
    assignee: text("assignee"),
    status: actionStatusEnum("status").notNull(),
    dueAt: zonedTimestamp("due_at"),
    completedAt: zonedTimestamp("completed_at"),
    createdAt: zonedTimestamp("created_at").notNull(),
  },
  (table) => [
    scopedUnique("action_items_id_workspace_unique").on(table.id, table.workspaceId),
    scopedIndex("action_items_workspace_idx").on(table.workspaceId),
    foreignKey({ columns: [table.caseId, table.workspaceId], foreignColumns: [cases.id, cases.workspaceId] }).onDelete("cascade"),
  ],
);

export const actionItemEvidenceSegments = pgTable(
  "action_item_evidence_segments",
  {
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    actionItemId: uuid("action_item_id").notNull(),
    artifactSegmentId: uuid("artifact_segment_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.actionItemId, table.artifactSegmentId] }),
    scopedIndex("action_item_evidence_segments_workspace_idx").on(table.workspaceId),
    foreignKey({ columns: [table.actionItemId, table.workspaceId], foreignColumns: [actionItems.id, actionItems.workspaceId] }).onDelete("cascade"),
    foreignKey({ columns: [table.artifactSegmentId, table.workspaceId], foreignColumns: [artifactSegments.id, artifactSegments.workspaceId] }).onDelete("restrict"),
  ],
);

export const decisions = pgTable(
  "decisions",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    caseId: uuid("case_id").notNull(),
    decisionType: text("decision_type").notNull(),
    proposal: text("proposal").notNull(),
    rationale: text("rationale").notNull(),
    riskLevel: riskLevelEnum("risk_level").notNull(),
    approvalPolicyId: text("approval_policy_id").notNull(),
    status: decisionStatusEnum("status").notNull(),
    createdAt: zonedTimestamp("created_at").notNull(),
    decidedAt: zonedTimestamp("decided_at"),
  },
  (table) => [
    scopedUnique("decisions_id_workspace_unique").on(table.id, table.workspaceId),
    scopedIndex("decisions_workspace_idx").on(table.workspaceId),
    foreignKey({ columns: [table.caseId, table.workspaceId], foreignColumns: [cases.id, cases.workspaceId] }).onDelete("cascade"),
  ],
);

export const decisionEvidenceSegments = pgTable(
  "decision_evidence_segments",
  {
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    decisionId: uuid("decision_id").notNull(),
    artifactSegmentId: uuid("artifact_segment_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.decisionId, table.artifactSegmentId] }),
    scopedIndex("decision_evidence_segments_workspace_idx").on(table.workspaceId),
    foreignKey({ columns: [table.decisionId, table.workspaceId], foreignColumns: [decisions.id, decisions.workspaceId] }).onDelete("cascade"),
    foreignKey({ columns: [table.artifactSegmentId, table.workspaceId], foreignColumns: [artifactSegments.id, artifactSegments.workspaceId] }).onDelete("restrict"),
  ],
);

export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    decisionId: uuid("decision_id").notNull(),
    approver: text("approver").notNull(),
    outcome: approvalOutcomeEnum("outcome").notNull(),
    comment: text("comment"),
    approvedAt: zonedTimestamp("approved_at").notNull(),
  },
  (table) => [
    scopedUnique("approvals_id_workspace_unique").on(table.id, table.workspaceId),
    scopedIndex("approvals_workspace_idx").on(table.workspaceId),
    foreignKey({ columns: [table.decisionId, table.workspaceId], foreignColumns: [decisions.id, decisions.workspaceId] }).onDelete("cascade"),
  ],
);

export const auditEntries = pgTable(
  "audit_entries",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    occurredAt: zonedTimestamp("occurred_at").notNull(),
    action: text("action").notNull(),
    actor: jsonb("actor").$type<AuditEntry["actor"]>().notNull(),
    subject: jsonb("subject").$type<AuditEntry["subject"]>().notNull(),
    cause: text("cause").notNull(),
    data: jsonb("data").$type<Attributes>().notNull(),
    previousEntryHash: text("previous_entry_hash"),
    entryHash: text("entry_hash").notNull(),
  },
  (table) => [
    scopedUnique("audit_entries_id_workspace_unique").on(table.id, table.workspaceId),
    scopedIndex("audit_entries_workspace_idx").on(table.workspaceId),
    index("audit_entries_workspace_occurred_idx").on(table.workspaceId, table.occurredAt),
  ],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
    sessionId: text("session_id").notNull(),
    name: text("name").notNull(),
    context: jsonb("context").$type<unknown>().notNull(),
    occurredAt: zonedTimestamp("occurred_at").notNull(),
  },
  (table) => [
    scopedIndex("analytics_events_workspace_occurred_idx").on(table.workspaceId, table.occurredAt),
    index("analytics_events_session_occurred_idx").on(table.sessionId, table.occurredAt),
    index("analytics_events_name_occurred_idx").on(table.name, table.occurredAt),
    check(
      "analytics_events_name_allowed",
      sql`${table.name} in ('landing-page-view', 'scenario-selected', 'demo-started', 'artifact-opened', 'artifact-processed', 'observation-reviewed', 'case-opened', 'decision-viewed', 'decision-approved', 'technical-trace-viewed', 'lens-switched', 'tour-completed', 'cta-opened', 'assessment-submitted')`,
    ),
  ],
);

export const assessmentSubmissions = pgTable(
  "assessment_submissions",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
    sessionId: text("session_id").notNull(),
    organisation: text("organisation").notNull(),
    industry: text("industry").notNull(),
    operationalWorkflow: text("operational_workflow").notNull(),
    currentSourceSystems: text("current_source_systems"),
    approximateInformationVolume: text("approximate_information_volume"),
    mainBottleneck: text("main_bottleneck").notNull(),
    currentReportingMethod: text("current_reporting_method"),
    dataSensitivity: text("data_sensitivity"),
    desiredResult: text("desired_result").notNull(),
    contactDetails: text("contact_details").notNull(),
    scenarioId: text("scenario_id"),
    submittedAt: zonedTimestamp("submitted_at").notNull(),
  },
  (table) => [
    scopedIndex("assessment_submissions_workspace_submitted_idx").on(
      table.workspaceId,
      table.submittedAt,
    ),
    index("assessment_submissions_submitted_idx").on(table.submittedAt),
  ],
);

/**
 * Shared token-bucket state for guest rate limiting (SECURITY.md §3.9).
 * Keys are pre-workspace (IP-derived or session identifiers), so this table
 * deliberately has no workspace foreign key. Only selected when
 * `OIW_RATE_LIMIT_STORE=postgres`; the process-local in-memory store remains
 * the default for single-instance deployments.
 */
export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  bucketKey: text("bucket_key").primaryKey(),
  tokens: doublePrecision("tokens").notNull(),
  refilledAtMs: doublePrecision("refilled_at_ms").notNull(),
  denialReportedAtMs: doublePrecision("denial_reported_at_ms"),
  touchedAtMs: doublePrecision("touched_at_ms").notNull(),
});
