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

const connection = createDatabase();
const repositories = createPostgresRepositories(connection.database);
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

  it("stores workspace scope structurally on every scoped table", async () => {
    const unscopedTables = await connection.client<{ table_name: string }[]>`
      SELECT tables.table_name
      FROM information_schema.tables AS tables
      WHERE tables.table_schema = 'public'
        AND tables.table_type = 'BASE TABLE'
        AND tables.table_name NOT IN ('workspaces', '__drizzle_migrations')
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
  });
});
