import { describe, expect, it } from "vitest";

import {
  ActionItemSchema,
  ApprovalSchema,
  ArtifactSchema,
  ArtifactSegmentSchema,
  AuditEntrySchema,
  CaseSchema,
  DecisionSchema,
  EntitySchema,
  MetricDefinitionSchema,
  ObservationSchema,
  OperationalEventSchema,
  SignalSchema,
  SourceSchema,
  WorkspaceSchema,
} from "./domain.js";

const ids = {
  primary: "00000000-0000-4000-8000-000000000001",
  secondary: "00000000-0000-4000-8000-000000000002",
  tertiary: "00000000-0000-4000-8000-000000000003",
  quaternary: "00000000-0000-4000-8000-000000000004",
};
const timestamp = "2026-08-31T00:00:00.000Z";
const checksum = "a".repeat(64);

const validContracts = [
  [
    "Workspace",
    WorkspaceSchema,
    {
      id: ids.primary,
      name: "Example workspace",
      slug: "example-workspace",
      activePackId: "example-pack",
      mode: "fixture",
      createdAt: timestamp,
      resetAt: null,
      expiresAt: null,
    },
  ],
  [
    "Source",
    SourceSchema,
    {
      id: ids.primary,
      workspaceId: ids.secondary,
      sourceType: "manual-entry",
      name: "Example source",
      configuration: {},
      createdAt: timestamp,
    },
  ],
  [
    "Artifact",
    ArtifactSchema,
    {
      id: ids.primary,
      workspaceId: ids.secondary,
      sourceId: ids.tertiary,
      artifactType: "plain-text",
      mimeType: "text/plain",
      receivedAt: timestamp,
      occurredAt: null,
      rawReference: "memory://example",
      rawText: "Example content",
      checksum,
      metadata: {},
      processingStatus: "received",
    },
  ],
  [
    "ArtifactSegment",
    ArtifactSegmentSchema,
    {
      id: ids.primary,
      artifactId: ids.secondary,
      locator: { kind: "text-range", start: 0, end: 7 },
      excerpt: "Example",
      checksum,
      createdAt: timestamp,
    },
  ],
  [
    "Entity",
    EntitySchema,
    {
      id: ids.primary,
      workspaceId: ids.secondary,
      entityType: "operational-record",
      displayName: "Record one",
      externalReference: "REF-1",
      aliases: [],
      attributes: {},
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  [
    "Observation",
    ObservationSchema,
    {
      id: ids.primary,
      artifactId: ids.secondary,
      entityId: null,
      schemaKey: "reference-code",
      value: "REF-1",
      normalisedValue: "REF-1",
      derivation: "machine",
      evidenceStatus: "supported",
      evidenceSegmentId: ids.tertiary,
      confidence: 0.95,
      extractor: { id: "fixture-provider", version: "1.0.0" },
      insufficiencyReason: null,
      reviewStatus: "not-required",
      reviewedBy: null,
      reviewedAt: null,
      createdAt: timestamp,
    },
  ],
  [
    "OperationalEvent",
    OperationalEventSchema,
    {
      id: ids.primary,
      workspaceId: ids.secondary,
      eventType: "record-received",
      occurredAt: timestamp,
      recordedAt: timestamp,
      entityIds: [ids.tertiary],
      observationIds: [ids.quaternary],
      attributes: {},
      assembly: { assemblerId: "default-assembler", assemblerVersion: "1.0.0" },
      reEvaluationStatus: "current",
    },
  ],
  [
    "Signal",
    SignalSchema,
    {
      id: ids.primary,
      workspaceId: ids.secondary,
      signalType: "attention-required",
      severity: "medium",
      eventIds: [ids.tertiary],
      evidenceSegmentIds: [ids.quaternary],
      rule: { id: "attention-rule", version: "1.0.0" },
      rationale: "A configured threshold was reached.",
      createdAt: timestamp,
    },
  ],
  [
    "Case",
    CaseSchema,
    {
      id: ids.primary,
      workspaceId: ids.secondary,
      caseType: "review-case",
      title: "Review required",
      status: "open",
      priority: "normal",
      severity: "medium",
      owner: null,
      dueAt: null,
      relatedEntityIds: [],
      relatedEventIds: [ids.tertiary],
      relatedSignalIds: [ids.quaternary],
      closureRequirementIds: ["review-complete"],
      reEvaluationStatus: "current",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  [
    "ActionItem",
    ActionItemSchema,
    {
      id: ids.primary,
      workspaceId: ids.secondary,
      caseId: ids.tertiary,
      actionType: "review-record",
      title: "Review the record",
      assignee: null,
      status: "open",
      dueAt: null,
      completionEvidenceSegmentIds: [],
      completedAt: null,
      createdAt: timestamp,
    },
  ],
  [
    "Decision",
    DecisionSchema,
    {
      id: ids.primary,
      workspaceId: ids.secondary,
      caseId: ids.tertiary,
      decisionType: "accept-proposal",
      proposal: "Accept the proposed resolution.",
      rationale: "The configured requirements are satisfied.",
      evidenceSegmentIds: [ids.quaternary],
      riskLevel: "high",
      approvalPolicyId: "authorised-reviewer",
      status: "awaiting-approval",
      createdAt: timestamp,
      decidedAt: null,
    },
  ],
  [
    "Approval",
    ApprovalSchema,
    {
      id: ids.primary,
      workspaceId: ids.secondary,
      decisionId: ids.tertiary,
      approver: "reviewer@example.test",
      outcome: "approved",
      comment: null,
      approvedAt: timestamp,
    },
  ],
  [
    "MetricDefinition",
    MetricDefinitionSchema,
    {
      id: "open-records",
      name: "Open records",
      description: "Count of records in an open state.",
      classification: "observed",
      aggregation: "count-records",
      parameters: { status: "open" },
      format: "number",
    },
  ],
  [
    "AuditEntry",
    AuditEntrySchema,
    {
      id: ids.primary,
      workspaceId: ids.secondary,
      occurredAt: timestamp,
      action: "record-created",
      actor: { type: "system", id: "fixture-seed" },
      subject: { type: "record", id: ids.tertiary },
      cause: "Fixture setup",
      data: {},
      previousEntryHash: null,
      entryHash: checksum,
    },
  ],
] as const;

describe.each(validContracts)("%s contract", (_name, schema, validValue) => {
  it("accepts a valid value", () => {
    expect(schema.safeParse(validValue).success).toBe(true);
  });

  it("rejects an invalid value", () => {
    expect(schema.safeParse({}).success).toBe(false);
  });
});

describe("Observation provenance", () => {
  it("rejects a supported machine observation without evidence", () => {
    const validObservation = validContracts.find(([name]) => name === "Observation")?.[2];
    expect(validObservation).toBeDefined();
    const result = ObservationSchema.safeParse({ ...validObservation, evidenceSegmentId: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("evidence segment");
    }
  });

  it("accepts an explicit insufficient-evidence observation", () => {
    const validObservation = validContracts.find(([name]) => name === "Observation")?.[2];
    expect(
      ObservationSchema.safeParse({
        ...validObservation,
        value: null,
        normalisedValue: null,
        evidenceStatus: "insufficient-evidence",
        evidenceSegmentId: null,
        insufficiencyReason: "The source does not state a value.",
        reviewStatus: "pending",
      }).success,
    ).toBe(true);
  });

  it("accepts a persisted negated observation", () => {
    const validObservation = validContracts.find(([name]) => name === "Observation")?.[2];
    expect(
      ObservationSchema.safeParse({
        ...validObservation,
        value: null,
        normalisedValue: null,
        evidenceStatus: "negated",
      }).success,
    ).toBe(true);
  });

  it("accepts alternative candidates for an ambiguous observation", () => {
    const validObservation = validContracts.find(([name]) => name === "Observation")?.[2];
    expect(
      ObservationSchema.safeParse({
        ...validObservation,
        alternativeCandidates: [
          { value: "REF-2", confidence: 0.72 },
          { value: "REF-3", confidence: 0.48 },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid alternative candidate confidence", () => {
    const validObservation = validContracts.find(([name]) => name === "Observation")?.[2];
    expect(
      ObservationSchema.safeParse({
        ...validObservation,
        alternativeCandidates: [{ value: "REF-2", confidence: -0.01 }],
      }).success,
    ).toBe(false);
  });

  it("accepts the conflicting review state and rejects unknown states", () => {
    const validObservation = validContracts.find(([name]) => name === "Observation")?.[2];
    expect(
      ObservationSchema.safeParse({ ...validObservation, reviewStatus: "conflicting" }).success,
    ).toBe(true);
    expect(
      ObservationSchema.safeParse({ ...validObservation, reviewStatus: "unresolved-conflict" }).success,
    ).toBe(false);
  });
});
