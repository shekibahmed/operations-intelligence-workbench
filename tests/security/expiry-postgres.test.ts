import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepareOperationalAudit, WorkspaceExpirySweep } from "@oiw/application";
import { createDatabase, createPostgresRepositories } from "../../packages/persistence/src/index.js";

const connection = createDatabase();
const repositories = createPostgresRepositories(connection.database);
const cleanupIds: string[] = [];

beforeAll(async () => {
  // Opens the lazy Postgres connection before the assertions begin.
  await repositories.workspaces.listExpired("1900-01-01T00:00:00.000Z");
});

afterAll(async () => {
  for (const workspaceId of cleanupIds) await repositories.workspaces.delete(workspaceId);
  await connection.close();
});

describe("Postgres workspace expiry entrypoint", () => {
  it("deletes an expired guest and its audit chain while preserving non-guests and active guests", async () => {
    const expiredGuestId = randomUUID();
    const activeGuestId = randomUUID();
    const privateId = randomUUID();
    cleanupIds.push(expiredGuestId, activeGuestId, privateId);

    await repositories.workspaces.insert({
      id: expiredGuestId,
      name: "Expired synthetic guest",
      slug: `expired-${expiredGuestId}`,
      activePackId: null,
      mode: "public-demo",
      createdAt: "1999-01-01T00:00:00.000Z",
      resetAt: null,
      expiresAt: "2000-01-01T00:00:00.000Z",
    });
    await repositories.workspaces.insert({
      id: activeGuestId,
      name: "Active synthetic guest",
      slug: `active-${activeGuestId}`,
      activePackId: null,
      mode: "public-demo",
      createdAt: "1999-01-01T00:00:00.000Z",
      resetAt: null,
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    await repositories.workspaces.insert({
      id: privateId,
      name: "Private synthetic workspace",
      slug: `private-${privateId}`,
      activePackId: null,
      mode: "private-pilot",
      createdAt: "1999-01-01T00:00:00.000Z",
      resetAt: null,
      expiresAt: "2000-01-01T00:00:00.000Z",
    });

    const audit = await prepareOperationalAudit(repositories.auditEntries, {
      workspaceId: expiredGuestId,
      occurredAt: "1999-01-01T00:00:00.000Z",
      action: "workspace-created",
      actorId: "expiry-security-test",
      subject: { type: "workspace", id: expiredGuestId },
      cause: "Synthetic expiry sweep verification",
      data: {},
    });
    await repositories.auditEntries.insert(expiredGuestId, audit);

    const result = await new WorkspaceExpirySweep(repositories.workspaces).run("2001-01-01T00:00:00.000Z");

    expect(result.deletedWorkspaceIds).toContain(expiredGuestId);
    expect(await repositories.workspaces.findById(expiredGuestId)).toBeNull();
    expect(await repositories.auditEntries.list(expiredGuestId)).toEqual([]);
    expect(await repositories.workspaces.findById(activeGuestId)).not.toBeNull();
    expect(await repositories.workspaces.findById(privateId)).not.toBeNull();
  });

  it("expires a guest workspace that holds an approved Decision and its append-only Approval", async () => {
    const workspaceId = randomUUID();
    const sourceId = randomUUID();
    const artifactId = randomUUID();
    const segmentId = randomUUID();
    const caseId = randomUUID();
    const decisionId = randomUUID();
    const at = "1999-01-01T00:00:00.000Z";
    cleanupIds.push(workspaceId);

    await repositories.workspaces.insert({
      id: workspaceId,
      name: "Expired synthetic guest with approval",
      slug: `expired-approval-${workspaceId}`,
      activePackId: null,
      mode: "public-demo",
      createdAt: at,
      resetAt: null,
      expiresAt: "2000-01-01T00:00:00.000Z",
    });
    await repositories.sources.insert(workspaceId, {
      id: sourceId,
      workspaceId,
      sourceType: "message",
      name: "Synthetic source",
      configuration: {},
      createdAt: at,
    });
    await repositories.artifacts.insert(workspaceId, {
      id: artifactId,
      workspaceId,
      sourceId,
      artifactType: "message",
      mimeType: "text/plain",
      receivedAt: at,
      occurredAt: at,
      rawReference: "synthetic/expiry-approval",
      rawText: "Synthetic evidence only.",
      checksum: "c".repeat(64),
      metadata: {},
      processingStatus: "processed",
    });
    await repositories.artifactSegments.insert(workspaceId, {
      id: segmentId,
      artifactId,
      locator: { kind: "text-range", start: 0, end: 19 },
      excerpt: "Synthetic evidence",
      checksum: null,
      createdAt: at,
    });
    await repositories.cases.insert(workspaceId, {
      id: caseId,
      workspaceId,
      caseType: "test-case",
      title: "Synthetic expiry case",
      status: "open",
      priority: "high",
      severity: "critical",
      owner: null,
      dueAt: null,
      relatedEntityIds: [],
      relatedEventIds: [],
      relatedSignalIds: [],
      closureRequirementIds: [],
      reEvaluationStatus: "current",
      createdAt: at,
      updatedAt: at,
    });
    await repositories.decisions.insert(workspaceId, {
      id: decisionId,
      workspaceId,
      caseId,
      decisionType: "test-decision",
      proposal: "Synthetic controlled proposal",
      rationale: "Expiry with an Approval present",
      evidenceSegmentIds: [segmentId],
      riskLevel: "critical",
      approvalPolicyId: "human-required",
      status: "awaiting-approval",
      createdAt: at,
      decidedAt: null,
    });
    await repositories.approvals.insert(workspaceId, {
      id: randomUUID(),
      workspaceId,
      decisionId,
      approver: "expiry-test-reviewer",
      outcome: "approved",
      comment: null,
      approvedAt: at,
    });
    await connection.client.unsafe("UPDATE decisions SET status = 'approved', decided_at = $2 WHERE id = $1", [
      decisionId,
      at,
    ]);
    expect(await repositories.approvals.list(workspaceId)).toHaveLength(1);

    const result = await new WorkspaceExpirySweep(repositories.workspaces).run("2001-01-01T00:00:00.000Z");

    expect(result.deletedWorkspaceIds).toContain(workspaceId);
    expect(await repositories.workspaces.findById(workspaceId)).toBeNull();
    expect(await repositories.approvals.list(workspaceId)).toEqual([]);
    expect(await repositories.decisions.list(workspaceId)).toEqual([]);
  });
});
