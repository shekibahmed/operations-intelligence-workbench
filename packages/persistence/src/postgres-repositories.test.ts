import type {
  ActionItem,
  Approval,
  Artifact,
  ArtifactSegment,
  AuditEntry,
  Case,
  Decision,
  Entity,
  Observation,
  OperationalEvent,
  Signal,
  Source,
  Workspace,
} from "@oiw/contracts";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "./database.js";
import { createPostgresRepositories } from "./postgres-repositories.js";
import {
  createAssessmentSubmissionRepository,
  createProductAnalyticsRepository,
} from "./product-analytics.js";

const connection = createDatabase();
const repositories = createPostgresRepositories(connection.database);
const analytics = createProductAnalyticsRepository(connection.database);
const assessments = createAssessmentSubmissionRepository(connection.database);
const timestamp = "2026-08-31T10:00:00.000Z";
const checksum = "a".repeat(64);

interface RecordSet {
  workspace: Workspace;
  source: Source;
  artifact: Artifact;
  segment: ArtifactSegment;
  entity: Entity;
  observation: Observation;
  event: OperationalEvent;
  signal: Signal;
  caseRecord: Case;
  actionItem: ActionItem;
  decision: Decision;
  approval: Approval;
  auditEntry: AuditEntry;
}

function createRecordSet(slug: string): RecordSet {
  const workspaceId = randomUUID();
  const sourceId = randomUUID();
  const artifactId = randomUUID();
  const segmentId = randomUUID();
  const entityId = randomUUID();
  const observationId = randomUUID();
  const eventId = randomUUID();
  const signalId = randomUUID();
  const caseId = randomUUID();
  const actionItemId = randomUUID();
  const decisionId = randomUUID();

  return {
    workspace: {
      id: workspaceId,
      name: `Workspace ${slug}`,
      slug,
      activePackId: null,
      mode: "fixture",
      createdAt: timestamp,
      resetAt: null,
      expiresAt: null,
    },
    source: {
      id: sourceId,
      workspaceId,
      sourceType: "manual-entry",
      name: "Manual source",
      configuration: { enabled: true },
      createdAt: timestamp,
    },
    artifact: {
      id: artifactId,
      workspaceId,
      sourceId,
      artifactType: "plain-text",
      mimeType: "text/plain",
      receivedAt: timestamp,
      occurredAt: null,
      rawReference: `fixture://${slug}`,
      rawText: "Synthetic operational note",
      checksum,
      metadata: { synthetic: true },
      processingStatus: "received",
    },
    segment: {
      id: segmentId,
      artifactId,
      locator: { kind: "text-range", start: 0, end: 9 },
      excerpt: "Synthetic",
      checksum: null,
      createdAt: timestamp,
    },
    entity: {
      id: entityId,
      workspaceId,
      entityType: "operational-object",
      displayName: "Object 1",
      externalReference: "OBJ-1",
      aliases: ["Object One"],
      attributes: { synthetic: true },
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    observation: {
      id: observationId,
      artifactId,
      entityId,
      schemaKey: "reported-state",
      value: "attention-required",
      normalisedValue: "attention-required",
      alternativeCandidates: [{ value: "normal", confidence: 0.2 }],
      derivation: "machine",
      evidenceStatus: "supported",
      evidenceSegmentId: segmentId,
      confidence: 0.9,
      extractor: { id: "fixture-extractor", version: "1.0.0" },
      insufficiencyReason: null,
      reviewStatus: "accepted",
      reviewedBy: "reviewer-1",
      reviewedAt: timestamp,
      createdAt: timestamp,
    },
    event: {
      id: eventId,
      workspaceId,
      eventType: "state-reported",
      occurredAt: timestamp,
      recordedAt: timestamp,
      entityIds: [entityId],
      observationIds: [observationId],
      attributes: { synthetic: true },
      assembly: { assemblerId: "event-assembler", assemblerVersion: "1.0.0" },
      reEvaluationStatus: "current",
    },
    signal: {
      id: signalId,
      workspaceId,
      signalType: "attention-needed",
      severity: "medium",
      eventIds: [eventId],
      evidenceSegmentIds: [segmentId],
      rule: { id: "attention-rule", version: "1.0.0" },
      rationale: "Synthetic condition matched.",
      createdAt: timestamp,
    },
    caseRecord: {
      id: caseId,
      workspaceId,
      caseType: "operational-review",
      title: "Review synthetic condition",
      status: "open",
      priority: "normal",
      severity: "medium",
      owner: "operator-1",
      dueAt: null,
      relatedEntityIds: [entityId],
      relatedEventIds: [eventId],
      relatedSignalIds: [signalId],
      closureRequirementIds: ["review-complete"],
      reEvaluationStatus: "current",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    actionItem: {
      id: actionItemId,
      workspaceId,
      caseId,
      actionType: "review-evidence",
      title: "Review supporting evidence",
      assignee: "operator-1",
      status: "open",
      dueAt: null,
      completionEvidenceSegmentIds: [segmentId],
      completedAt: null,
      createdAt: timestamp,
    },
    decision: {
      id: decisionId,
      workspaceId,
      caseId,
      decisionType: "accept-proposal",
      proposal: "Accept the proposed operational response.",
      rationale: "The evidence supports review.",
      evidenceSegmentIds: [segmentId],
      riskLevel: "high",
      approvalPolicyId: "human-approval",
      status: "awaiting-approval",
      createdAt: timestamp,
      decidedAt: null,
    },
    approval: {
      id: randomUUID(),
      workspaceId,
      decisionId,
      approver: "human-reviewer",
      outcome: "approved",
      comment: "Evidence reviewed.",
      approvedAt: timestamp,
    },
    auditEntry: {
      id: randomUUID(),
      workspaceId,
      occurredAt: timestamp,
      action: "record-created",
      actor: { type: "system", id: "persistence-test" },
      subject: { type: "artifact", id: artifactId },
      cause: "Integration test",
      data: { synthetic: true },
      previousEntryHash: null,
      entryHash: "b".repeat(64),
    },
  };
}

async function insertRecordSet(records: RecordSet): Promise<void> {
  const workspaceId = records.workspace.id;
  await repositories.workspaces.insert(records.workspace);
  await repositories.sources.insert(workspaceId, records.source);
  await repositories.artifacts.insert(workspaceId, records.artifact);
  await repositories.artifactSegments.insert(workspaceId, records.segment);
  await repositories.entities.insert(workspaceId, records.entity);
  await repositories.observations.insert(workspaceId, records.observation);
  await repositories.operationalEvents.insert(workspaceId, records.event);
  await repositories.signals.insert(workspaceId, records.signal);
  await repositories.cases.insert(workspaceId, records.caseRecord);
  await repositories.actionItems.insert(workspaceId, records.actionItem);
  await repositories.decisions.insert(workspaceId, records.decision);
  await repositories.approvals.insert(workspaceId, records.approval);
  await repositories.auditEntries.insert(workspaceId, records.auditEntry);
}

beforeAll(async () => {
  const migrationRows = await connection.client<{ count: string }[]>`
    SELECT count(*)::text AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'workspaces'
  `;
  if (migrationRows[0]?.count !== "1") {
    throw new Error("Persistence integration tests require `pnpm db:migrate` first");
  }
});

beforeEach(async () => {
  await connection.client.unsafe("TRUNCATE TABLE workspaces CASCADE");
});

afterAll(async () => {
  await connection.close();
});

describe.sequential("Postgres persistence repositories", () => {
  it("round-trips every canonical persisted object", async () => {
    const records = createRecordSet("round-trip");
    await insertRecordSet(records);
    const workspaceId = records.workspace.id;

    expect(await repositories.workspaces.findById(workspaceId)).toEqual(records.workspace);
    expect(await repositories.sources.findById(workspaceId, records.source.id)).toEqual(records.source);
    expect(await repositories.artifacts.findById(workspaceId, records.artifact.id)).toEqual(records.artifact);
    expect(await repositories.artifactSegments.findById(workspaceId, records.segment.id)).toEqual(records.segment);
    expect(await repositories.entities.findById(workspaceId, records.entity.id)).toEqual(records.entity);
    expect(await repositories.observations.findById(workspaceId, records.observation.id)).toEqual(records.observation);
    expect(await repositories.operationalEvents.findById(workspaceId, records.event.id)).toEqual(records.event);
    expect(await repositories.signals.findById(workspaceId, records.signal.id)).toEqual(records.signal);
    expect(await repositories.cases.findById(workspaceId, records.caseRecord.id)).toEqual(records.caseRecord);
    expect(await repositories.actionItems.findById(workspaceId, records.actionItem.id)).toEqual(records.actionItem);
    expect(await repositories.decisions.findById(workspaceId, records.decision.id)).toEqual(records.decision);
    expect(await repositories.approvals.findById(workspaceId, records.approval.id)).toEqual(records.approval);
    expect(await repositories.auditEntries.findById(workspaceId, records.auditEntry.id)).toEqual(records.auditEntry);
  });

  it("requires workspace scope for every read and write", async () => {
    const records = createRecordSet("workspace-a");
    const other = createRecordSet("workspace-b");
    await insertRecordSet(records);
    await repositories.workspaces.insert(other.workspace);
    const workspaceId = other.workspace.id;

    expect(await repositories.sources.findById(workspaceId, records.source.id)).toBeNull();
    expect(await repositories.artifacts.findById(workspaceId, records.artifact.id)).toBeNull();
    expect(await repositories.artifactSegments.findById(workspaceId, records.segment.id)).toBeNull();
    expect(await repositories.entities.findById(workspaceId, records.entity.id)).toBeNull();
    expect(await repositories.observations.findById(workspaceId, records.observation.id)).toBeNull();
    expect(await repositories.operationalEvents.findById(workspaceId, records.event.id)).toBeNull();
    expect(await repositories.signals.findById(workspaceId, records.signal.id)).toBeNull();
    expect(await repositories.cases.findById(workspaceId, records.caseRecord.id)).toBeNull();
    expect(await repositories.actionItems.findById(workspaceId, records.actionItem.id)).toBeNull();
    expect(await repositories.decisions.findById(workspaceId, records.decision.id)).toBeNull();
    expect(await repositories.approvals.findById(workspaceId, records.approval.id)).toBeNull();
    expect(await repositories.auditEntries.findById(workspaceId, records.auditEntry.id)).toBeNull();

    const corrected = { ...records.observation, reviewStatus: "corrected" as const };
    expect(
      await repositories.observations.correct(workspaceId, records.observation.id, corrected, {
        ...records.auditEntry,
        id: randomUUID(),
        workspaceId,
      }),
    ).toBeNull();
    expect(
      (await repositories.observations.findById(records.workspace.id, records.observation.id))
        ?.reviewStatus,
    ).toBe("accepted");

    await expect(repositories.sources.insert(workspaceId, records.source)).rejects.toThrow(
      "workspace scope",
    );
  });

  it("allows only processing-status updates on immutable Artifacts", async () => {
    const records = createRecordSet("immutable-artifact");
    await repositories.workspaces.insert(records.workspace);
    await repositories.sources.insert(records.workspace.id, records.source);
    await repositories.artifacts.insert(records.workspace.id, records.artifact);

    const updated = await repositories.artifacts.updateProcessingStatus(
      records.workspace.id,
      records.artifact.id,
      "processed",
    );
    expect(updated?.processingStatus).toBe("processed");
    await expect(
      connection.client`UPDATE artifacts SET raw_text = 'changed' WHERE id = ${records.artifact.id}`,
    ).rejects.toThrow("Artifact source fields are immutable");
  });

  it("appends correction history and flags downstream state for re-evaluation", async () => {
    const records = createRecordSet("correction-history");
    await insertRecordSet(records);
    const correctionAudit: AuditEntry = {
      ...records.auditEntry,
      id: randomUUID(),
      action: "observation-corrected",
      subject: { type: "observation", id: records.observation.id },
      entryHash: "c".repeat(64),
    };
    const corrected: Observation = {
      ...records.observation,
      value: "reviewed-value",
      normalisedValue: "reviewed-value",
      reviewStatus: "corrected",
      reviewedBy: "human-reviewer",
    };

    expect(
      await repositories.observations.correct(
        records.workspace.id,
        records.observation.id,
        corrected,
        correctionAudit,
      ),
    ).toEqual(corrected);
    expect(
      await repositories.observations.listRevisions(
        records.workspace.id,
        records.observation.id,
      ),
    ).toEqual([records.observation]);
    expect(
      (await repositories.operationalEvents.findById(records.workspace.id, records.event.id))
        ?.reEvaluationStatus,
    ).toBe("required");
    expect(
      (await repositories.cases.findById(records.workspace.id, records.caseRecord.id))
        ?.reEvaluationStatus,
    ).toBe("required");
    expect(
      await repositories.auditEntries.findById(records.workspace.id, correctionAudit.id),
    ).toEqual(correctionAudit);
  });

  it("enforces append-only Audit Entries at the database boundary", async () => {
    const records = createRecordSet("append-only-audit");
    await insertRecordSet(records);

    await expect(
      connection.client`UPDATE audit_entries SET cause = 'changed' WHERE id = ${records.auditEntry.id}`,
    ).rejects.toThrow("Audit entries are append-only");
    await expect(
      connection.client`DELETE FROM audit_entries WHERE id = ${records.auditEntry.id}`,
    ).rejects.toThrow("Audit entries are append-only");
    expect(await repositories.auditEntries.findById(records.workspace.id, records.auditEntry.id)).toEqual(
      records.auditEntry,
    );
  });

  it("requires a matching human Approval before a Decision can become approved", async () => {
    const records = createRecordSet("approval-required");
    await insertRecordSet(records);
    const approvedDecision: Decision = {
      ...records.decision,
      status: "approved",
      decidedAt: timestamp,
    };
    expect(
      await repositories.decisions.update(records.workspace.id, records.decision.id, approvedDecision),
    ).toEqual(approvedDecision);

    const withoutApproval = createRecordSet("approval-missing");
    await repositories.workspaces.insert(withoutApproval.workspace);
    await repositories.sources.insert(withoutApproval.workspace.id, withoutApproval.source);
    await repositories.artifacts.insert(withoutApproval.workspace.id, withoutApproval.artifact);
    await repositories.artifactSegments.insert(withoutApproval.workspace.id, withoutApproval.segment);
    await repositories.entities.insert(withoutApproval.workspace.id, withoutApproval.entity);
    await repositories.observations.insert(withoutApproval.workspace.id, withoutApproval.observation);
    await repositories.operationalEvents.insert(withoutApproval.workspace.id, withoutApproval.event);
    await repositories.signals.insert(withoutApproval.workspace.id, withoutApproval.signal);
    await repositories.cases.insert(withoutApproval.workspace.id, withoutApproval.caseRecord);
    await expect(
      repositories.decisions.insert(withoutApproval.workspace.id, {
        ...withoutApproval.decision,
        status: "approved",
        decidedAt: timestamp,
      }),
    ).rejects.toThrow("Failed query");
    expect(
      await repositories.decisions.findById(
        withoutApproval.workspace.id,
        withoutApproval.decision.id,
      ),
    ).toBeNull();
  });

  it("stores workspace scope structurally on every canonical operational table", async () => {
    const unscopedTables = await connection.client<{ table_name: string }[]>`
      SELECT tables.table_name
      FROM information_schema.tables AS tables
      WHERE tables.table_schema = 'public'
        AND tables.table_type = 'BASE TABLE'
        AND tables.table_name NOT IN (
          'workspaces', '__drizzle_migrations', 'analytics_events', 'assessment_submissions'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns AS columns
          WHERE columns.table_schema = tables.table_schema
            AND columns.table_name = tables.table_name
            AND columns.column_name = 'workspace_id'
            AND columns.is_nullable = 'NO'
        )
    `;
    expect(unscopedTables).toEqual([]);

    const engagementScopes = await connection.client<{
      table_name: string;
      workspace_nullable: string;
      session_nullable: string;
    }[]>`
      SELECT tables.table_name,
        workspace_columns.is_nullable AS workspace_nullable,
        session_columns.is_nullable AS session_nullable
      FROM information_schema.tables AS tables
      JOIN information_schema.columns AS workspace_columns
        ON workspace_columns.table_schema = tables.table_schema
        AND workspace_columns.table_name = tables.table_name
        AND workspace_columns.column_name = 'workspace_id'
      JOIN information_schema.columns AS session_columns
        ON session_columns.table_schema = tables.table_schema
        AND session_columns.table_name = tables.table_name
        AND session_columns.column_name = 'session_id'
      WHERE tables.table_schema = 'public'
        AND tables.table_name IN ('analytics_events', 'assessment_submissions')
      ORDER BY tables.table_name
    `;
    expect(engagementScopes).toEqual([
      { table_name: "analytics_events", workspace_nullable: "YES", session_nullable: "NO" },
      { table_name: "assessment_submissions", workspace_nullable: "YES", session_nullable: "NO" },
    ]);
  });

  it("finds workspaces by slug and lists only TTL-expired workspaces in stable order", async () => {
    const firstExpired = createRecordSet("expired-first").workspace;
    const secondExpired = createRecordSet("expired-second").workspace;
    const active = createRecordSet("not-expired").workspace;
    const withoutExpiry = createRecordSet("without-expiry").workspace;

    await repositories.workspaces.insert({
      ...firstExpired,
      expiresAt: "2026-08-31T09:00:00.000Z",
    });
    await repositories.workspaces.insert({
      ...secondExpired,
      expiresAt: "2026-08-31T09:30:00.000Z",
    });
    await repositories.workspaces.insert({
      ...active,
      expiresAt: "2026-08-31T11:00:00.000Z",
    });
    await repositories.workspaces.insert(withoutExpiry);

    expect(await repositories.workspaces.findBySlug(secondExpired.slug)).toEqual({
      ...secondExpired,
      expiresAt: "2026-08-31T09:30:00.000Z",
    });
    expect(await repositories.workspaces.findBySlug("missing-workspace")).toBeNull();
    expect(
      (await repositories.workspaces.listExpired("2026-08-31T10:00:00.000Z")).map(
        (workspace) => workspace.slug,
      ),
    ).toEqual(["expired-first", "expired-second"]);
  });

  it("clears one workspace atomically for reset while preserving audit history and isolation", async () => {
    const records = createRecordSet("reset-target");
    const other = createRecordSet("reset-neighbour");
    await insertRecordSet(records);
    await insertRecordSet(other);
    const resetAudit: AuditEntry = {
      ...records.auditEntry,
      id: randomUUID(),
      action: "workspace-reset",
      subject: { type: "workspace", id: records.workspace.id },
      cause: "Deterministic fixture reset",
      entryHash: "d".repeat(64),
    };

    expect(
      await repositories.workspaces.clearForReset(records.workspace.id, resetAudit),
    ).toBe(true);
    expect(await repositories.sources.list(records.workspace.id)).toEqual([]);
    expect(await repositories.artifacts.list(records.workspace.id)).toEqual([]);
    expect(await repositories.artifactSegments.list(records.workspace.id)).toEqual([]);
    expect(await repositories.entities.list(records.workspace.id)).toEqual([]);
    expect(await repositories.observations.list(records.workspace.id)).toEqual([]);
    expect(await repositories.operationalEvents.list(records.workspace.id)).toEqual([]);
    expect(await repositories.signals.list(records.workspace.id)).toEqual([]);
    expect(await repositories.cases.list(records.workspace.id)).toEqual([]);
    expect(await repositories.actionItems.list(records.workspace.id)).toEqual([]);
    expect(await repositories.decisions.list(records.workspace.id)).toEqual([]);
    expect(await repositories.approvals.list(records.workspace.id)).toEqual([]);
    expect(await repositories.auditEntries.list(records.workspace.id)).toEqual(
      expect.arrayContaining([records.auditEntry, resetAudit]),
    );
    expect(await repositories.auditEntries.list(records.workspace.id)).toHaveLength(2);

    expect(await repositories.artifacts.findById(other.workspace.id, other.artifact.id)).toEqual(
      other.artifact,
    );
    expect(await repositories.auditEntries.list(other.workspace.id)).toEqual([other.auditEntry]);
  });

  it("rolls back a reset clear when its audit append fails", async () => {
    const records = createRecordSet("reset-rollback");
    await insertRecordSet(records);

    await expect(
      repositories.workspaces.clearForReset(records.workspace.id, {
        ...records.auditEntry,
        action: "workspace-reset",
        subject: { type: "workspace", id: records.workspace.id },
      }),
    ).rejects.toThrow("Failed query");
    expect(
      await repositories.artifacts.findById(records.workspace.id, records.artifact.id),
    ).toEqual(records.artifact);
    expect(await repositories.auditEntries.list(records.workspace.id)).toEqual([
      records.auditEntry,
    ]);
  });

  it("deletes a whole workspace including audit rows without touching another workspace", async () => {
    const records = createRecordSet("delete-target");
    const other = createRecordSet("delete-neighbour");
    await insertRecordSet(records);
    await insertRecordSet(other);

    expect(await repositories.workspaces.delete(records.workspace.id)).toBe(true);
    expect(await repositories.workspaces.findById(records.workspace.id)).toBeNull();
    expect(await repositories.auditEntries.list(records.workspace.id)).toEqual([]);
    expect(await repositories.workspaces.delete(records.workspace.id)).toBe(false);

    expect(await repositories.workspaces.findById(other.workspace.id)).toEqual(other.workspace);
    expect(await repositories.artifacts.findById(other.workspace.id, other.artifact.id)).toEqual(
      other.artifact,
    );
    expect(await repositories.auditEntries.list(other.workspace.id)).toEqual([other.auditEntry]);
  });

  it("keeps analytics and assessment reads workspace-scoped and event writes idempotent", async () => {
    const records = createRecordSet("analytics-workspace");
    const other = createRecordSet("analytics-neighbour");
    await repositories.workspaces.insert(records.workspace);
    await repositories.workspaces.insert(other.workspace);
    const event = {
      id: randomUUID(),
      workspaceId: records.workspace.id,
      sessionId: randomUUID(),
      name: "cta-opened",
      context: { scenarioId: "example-pack" },
      occurredAt: "2026-09-03T08:01:00.000Z",
    };

    expect(await analytics.insert(event)).toBe(true);
    expect(await analytics.insert(event)).toBe(false);
    expect(await analytics.listByWorkspace(records.workspace.id)).toEqual([event]);
    expect(await analytics.listByWorkspace(other.workspace.id)).toEqual([]);
    expect(await analytics.listBySession(event.sessionId)).toEqual([event]);

    const submission = {
      id: randomUUID(),
      workspaceId: records.workspace.id,
      sessionId: event.sessionId,
      organisation: "Example Operations",
      industry: "Cross-sector",
      operationalWorkflow: "Exception review",
      currentSourceSystems: null,
      approximateInformationVolume: null,
      mainBottleneck: "Manual triage",
      currentReportingMethod: null,
      dataSensitivity: null,
      desiredResult: "Faster follow-up",
      contactDetails: "person@example.test",
      scenarioId: "example-pack",
      submittedAt: "2026-09-03T08:02:00.000Z",
    };
    expect(await assessments.insert(submission)).toEqual(submission);
    expect(await assessments.listByWorkspace(records.workspace.id)).toEqual([submission]);
    expect(await assessments.listByWorkspace(other.workspace.id)).toEqual([]);

    const columns = await connection.client<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name IN ('analytics_events', 'assessment_submissions')
      ORDER BY column_name
    `;
    expect(columns.map((row) => row.column_name)).not.toContain("ip_address");
    expect(columns.map((row) => row.column_name)).not.toContain("ip");
  });

  it("summarises engagement and assessment counts without returning submission PII", async () => {
    const sessionId = randomUUID();
    await analytics.insert({
      id: randomUUID(),
      workspaceId: null,
      sessionId,
      name: "landing-page-view",
      context: { path: "/" },
      occurredAt: "2026-09-03T08:00:00.000Z",
    });
    await assessments.insert({
      id: randomUUID(),
      workspaceId: null,
      sessionId,
      organisation: "Summary-hidden organisation",
      industry: "Cross-sector",
      operationalWorkflow: "Review",
      currentSourceSystems: null,
      approximateInformationVolume: null,
      mainBottleneck: "Triage",
      currentReportingMethod: null,
      dataSensitivity: null,
      desiredResult: "Visibility",
      contactDetails: "hidden@example.test",
      scenarioId: null,
      submittedAt: "2026-09-03T08:02:00.000Z",
    });

    const summary = await analytics.summary();
    expect(summary).toEqual({
      totalEvents: 1,
      events: [{ name: "landing-page-view", count: 1 }],
      assessmentSubmissions: 1,
    });
    expect(JSON.stringify(summary)).not.toContain("hidden@example.test");
  });
});
