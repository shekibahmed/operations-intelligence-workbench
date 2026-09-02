import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ApprovalService } from "@oiw/application";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase, defaultDatabaseUrl } from "../../packages/persistence/src/database.js";
import { createPostgresRepositories } from "../../packages/persistence/src/postgres-repositories.js";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const migrationsDirectory = resolve(repositoryRoot, "db/migrations");
const databaseName = `oiw812_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 8)}`;
const baseDatabaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;
const testDatabaseUrl = new URL(baseDatabaseUrl);
testDatabaseUrl.pathname = `/${databaseName}`;

const adminConnection = createDatabase(baseDatabaseUrl);
let testConnection: ReturnType<typeof createDatabase>;
let repositories: ReturnType<typeof createPostgresRepositories>;

async function migrateIsolatedDatabase(): Promise<void> {
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));
  for (const file of migrationFiles) {
    const sql = await readFile(resolve(migrationsDirectory, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim().length > 0) await testConnection.client.unsafe(statement);
    }
  }
}

beforeAll(async () => {
  await adminConnection.client.unsafe(`CREATE DATABASE "${databaseName}"`);
  testConnection = createDatabase(testDatabaseUrl.toString());
  await migrateIsolatedDatabase();
  repositories = createPostgresRepositories(testConnection.database);
});

afterAll(async () => {
  if (testConnection !== undefined) await testConnection.close();
  await adminConnection.client.unsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  await adminConnection.close();
});

describe("approval concurrency", () => {
  it("persists exactly one of two simultaneous opposing outcomes", async () => {
    const timestamp = "2026-09-02T00:00:00.000Z";
    const workspaceId = randomUUID();
    const sourceId = randomUUID();
    const artifactId = randomUUID();
    const segmentId = randomUUID();
    const caseId = randomUUID();
    const decisionId = randomUUID();

    await repositories.workspaces.insert({
      id: workspaceId,
      name: "Synthetic approval concurrency workspace",
      slug: `approval-concurrency-${workspaceId}`,
      activePackId: "test-pack",
      mode: "public-demo",
      createdAt: timestamp,
      resetAt: null,
      expiresAt: "2099-09-02T00:00:00.000Z",
    });
    await repositories.sources.insert(workspaceId, {
      id: sourceId,
      workspaceId,
      sourceType: "message",
      name: "Synthetic source",
      configuration: {},
      createdAt: timestamp,
    });
    await repositories.artifacts.insert(workspaceId, {
      id: artifactId,
      workspaceId,
      sourceId,
      artifactType: "message",
      mimeType: "text/plain",
      receivedAt: timestamp,
      occurredAt: timestamp,
      rawReference: "synthetic/concurrency",
      rawText: "Synthetic evidence only.",
      checksum: "a".repeat(64),
      metadata: {},
      processingStatus: "processed",
    });
    await repositories.artifactSegments.insert(workspaceId, {
      id: segmentId,
      artifactId,
      locator: { kind: "text-range", start: 0, end: 19 },
      excerpt: "Synthetic evidence",
      checksum: null,
      createdAt: timestamp,
    });
    await repositories.cases.insert(workspaceId, {
      id: caseId,
      workspaceId,
      caseType: "test-case",
      title: "Synthetic concurrent decision",
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
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await repositories.decisions.insert(workspaceId, {
      id: decisionId,
      workspaceId,
      caseId,
      decisionType: "test-decision",
      proposal: "Synthetic controlled proposal",
      rationale: "Concurrency safety test",
      evidenceSegmentIds: [segmentId],
      riskLevel: "critical",
      approvalPolicyId: "human-required",
      status: "awaiting-approval",
      createdAt: timestamp,
      decidedAt: null,
    });

    const serviceA = new ApprovalService(repositories, () => new Date("2026-09-02T00:00:01.000Z"));
    const serviceB = new ApprovalService(repositories, () => new Date("2026-09-02T00:00:02.000Z"));
    const results = await Promise.allSettled([
      serviceA.apply(workspaceId, decisionId, {
        identity: { type: "human", id: "reviewer-a" },
        outcome: "approved",
        comment: "Approve after evidence review.",
      }),
      serviceB.apply(workspaceId, decisionId, {
        identity: { type: "human", id: "reviewer-b" },
        outcome: "rejected",
        comment: "Reject after evidence review.",
      }),
    ]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(results.filter(({ status }) => status === "rejected")).toHaveLength(1);

    const approvals = await repositories.approvals.list(workspaceId);
    const persistedDecision = await repositories.decisions.findById(workspaceId, decisionId);
    expect(approvals).toHaveLength(1);
    expect(persistedDecision?.status).toBe(approvals[0]?.outcome);
    expect(
      (await repositories.auditEntries.list(workspaceId)).filter(({ action }) =>
        action.startsWith("decision-") || action === "case-decision-outcome-recorded",
      ),
    ).toHaveLength(2);
  });
});
