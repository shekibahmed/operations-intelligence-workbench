import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ApprovalService, DecisionService } from "@oiw/application";
import type { Approval, Decision } from "@oiw/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase, defaultDatabaseUrl } from "../../packages/persistence/src/database.js";
import { createPostgresRepositories } from "../../packages/persistence/src/postgres-repositories.js";

/**
 * OIW-918: adversarial approval-governance tests against a real, throwaway
 * Postgres database (every migration applied, so the production trigger and
 * constraints are the ones under test; nothing is mocked).
 *
 * Covers the README / docs/EVALUATION.md section 9 / docs/SECURITY.md 3.7
 * claims that
 *   (a) an Approval recorded for one Decision cannot authorise another,
 *   (b) an Approval with no identified human approver is not recorded.
 * Both are checked at the application layer (ApprovalService) and with raw
 * SQL, so the database-level enforcement (and its limits) are explicit. The
 * provider-output claim lives in provider-approval-shaped-output.test.ts.
 */

const repositoryRoot = resolve(import.meta.dirname, "../..");
const migrationsDirectory = resolve(repositoryRoot, "db/migrations");
const databaseName = `oiw918_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 8)}`;
const baseDatabaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;
const testDatabaseUrl = new URL(baseDatabaseUrl);
testDatabaseUrl.pathname = `/${databaseName}`;
const timestamp = "2026-09-02T00:00:00.000Z";

const adminConnection = createDatabase(baseDatabaseUrl);
let testConnection: ReturnType<typeof createDatabase>;
let repositories: ReturnType<typeof createPostgresRepositories>;

function sql(query: string, parameters: unknown[] = []) {
  return testConnection.client.unsafe(query, parameters as never[]);
}

async function migrateIsolatedDatabase(): Promise<void> {
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));
  for (const file of migrationFiles) {
    const migration = await readFile(resolve(migrationsDirectory, file), "utf8");
    for (const statement of migration.split("--> statement-breakpoint")) {
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

interface Scenario {
  workspaceId: string;
  decisionX: string;
  decisionY: string;
}

/** A fresh workspace with one Case and two unrelated awaiting-approval Decisions, X and Y. */
async function seedScenario(): Promise<Scenario> {
  const workspaceId = randomUUID();
  const sourceId = randomUUID();
  const artifactId = randomUUID();
  const segmentId = randomUUID();
  const caseId = randomUUID();
  const decisionX = randomUUID();
  const decisionY = randomUUID();

  await repositories.workspaces.insert({
    id: workspaceId,
    name: "Synthetic approval governance workspace",
    slug: `approval-governance-${workspaceId}`,
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
    rawReference: "synthetic/governance",
    rawText: "Synthetic evidence only.",
    checksum: "b".repeat(64),
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
    title: "Synthetic governance case",
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
  for (const id of [decisionX, decisionY]) {
    const decision: Decision = {
      id,
      workspaceId,
      caseId,
      decisionType: "test-decision",
      proposal: "Synthetic controlled proposal",
      rationale: "Approval governance test",
      evidenceSegmentIds: [segmentId],
      riskLevel: "critical",
      approvalPolicyId: "human-required",
      status: "awaiting-approval",
      createdAt: timestamp,
      decidedAt: null,
    };
    await repositories.decisions.insert(workspaceId, decision);
  }
  return { workspaceId, decisionX, decisionY };
}

function approvalService(): ApprovalService {
  return new ApprovalService(repositories, () => new Date("2026-09-02T00:00:05.000Z"));
}

async function statusOf(workspaceId: string, decisionId: string): Promise<Decision["status"]> {
  const decision = await repositories.decisions.findById(workspaceId, decisionId);
  if (decision === null) throw new Error("Decision missing from the throwaway database");
  return decision.status;
}

async function decisionAuditCount(workspaceId: string): Promise<number> {
  return (await repositories.auditEntries.list(workspaceId)).filter(
    ({ action }) => action.startsWith("decision-") || action === "case-decision-outcome-recorded",
  ).length;
}

async function insertRawApproval(
  values: Pick<Approval, "id" | "workspaceId" | "decisionId" | "approver" | "outcome">,
): Promise<void> {
  await sql(
    `INSERT INTO approvals (id, workspace_id, decision_id, approver, outcome, comment, approved_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      values.id,
      values.workspaceId,
      values.decisionId,
      values.approver,
      values.outcome,
      "raw SQL attempt",
      timestamp,
    ],
  );
}

describe("(a) an Approval for Decision X never authorises Decision Y", () => {
  it("application layer: approving X leaves Y awaiting approval, with no Approval for Y", async () => {
    const { workspaceId, decisionX, decisionY } = await seedScenario();

    const result = await approvalService().apply(workspaceId, decisionX, {
      identity: { type: "human", id: "reviewer-a" },
      outcome: "approved",
      comment: "Evidence reviewed for X only.",
    });

    expect(result.decision.status).toBe("approved");
    expect(await statusOf(workspaceId, decisionY)).toBe("awaiting-approval");
    const approvals = await repositories.approvals.list(workspaceId);
    expect(approvals).toHaveLength(1);
    expect(approvals[0]?.decisionId).toBe(decisionX);
    expect(approvals.some(({ decisionId }) => decisionId === decisionY)).toBe(false);
  });

  it("application layer: a replayed X request cannot be redirected at Y, and Y needs its own Approval", async () => {
    const { workspaceId, decisionX, decisionY } = await seedScenario();
    const first = await approvalService().apply(workspaceId, decisionX, {
      identity: { type: "human", id: "reviewer-a" },
      outcome: "approved",
      comment: "Evidence reviewed for X only.",
    });

    // Replaying the identical request for X is refused (X is no longer awaiting approval).
    await expect(
      approvalService().apply(workspaceId, decisionX, {
        identity: { type: "human", id: "reviewer-a" },
        outcome: "approved",
        comment: "Replay.",
      }),
    ).rejects.toThrow(/not awaiting approval/u);

    // The repository refuses to re-insert the captured Approval record (same id)
    // against Y: the primary key is the Approval id.
    await expect(
      repositories.approvals.insert(workspaceId, { ...first.approval, decisionId: decisionY }),
    ).rejects.toThrow();
    expect(await statusOf(workspaceId, decisionY)).toBe("awaiting-approval");

    // Y can only be approved by its own, distinct Approval record.
    const second = await approvalService().apply(workspaceId, decisionY, {
      identity: { type: "human", id: "reviewer-b" },
      outcome: "approved",
      comment: "Evidence reviewed for Y.",
    });
    expect(second.approval.id).not.toBe(first.approval.id);
    expect(second.approval.decisionId).toBe(decisionY);
    expect(await repositories.approvals.list(workspaceId)).toHaveLength(2);
  });

  it("application layer: a Decision in another workspace cannot be approved through this workspace", async () => {
    const a = await seedScenario();
    const b = await seedScenario();

    await expect(
      approvalService().apply(a.workspaceId, b.decisionX, {
        identity: { type: "human", id: "reviewer-a" },
        outcome: "approved",
        comment: "Cross-workspace attempt.",
      }),
    ).rejects.toThrow(/was not found/u);

    expect(await statusOf(b.workspaceId, b.decisionX)).toBe("awaiting-approval");
    expect(await repositories.approvals.list(b.workspaceId)).toEqual([]);
    expect(await repositories.approvals.list(a.workspaceId)).toEqual([]);
  });

  it("application layer: the status-bypass entry point refuses to set approved", async () => {
    const { workspaceId, decisionY } = await seedScenario();
    await expect(
      new DecisionService(repositories).attemptStatusBypass(workspaceId, decisionY, "approved"),
    ).rejects.toThrow(/recorded human Approval/u);
    expect(await statusOf(workspaceId, decisionY)).toBe("awaiting-approval");
  });

  it("database: X's approved Approval does not let raw SQL mark Y approved", async () => {
    const { workspaceId, decisionX, decisionY } = await seedScenario();
    await approvalService().apply(workspaceId, decisionX, {
      identity: { type: "human", id: "reviewer-a" },
      outcome: "approved",
      comment: "Evidence reviewed for X only.",
    });

    await expect(
      sql(`UPDATE decisions SET status = 'approved' WHERE id = $1 AND workspace_id = $2`, [
        decisionY,
        workspaceId,
      ]),
    ).rejects.toThrow(/approved Decision requires a matching human Approval/u);
    expect(await statusOf(workspaceId, decisionY)).toBe("awaiting-approval");
  });

  it("database: a raw INSERT of an already-approved Decision with no Approval is rejected", async () => {
    const { workspaceId, decisionX } = await seedScenario();
    const original = await repositories.decisions.findById(workspaceId, decisionX);
    await expect(
      sql(
        `INSERT INTO decisions (id, workspace_id, case_id, decision_type, proposal, rationale,
                                risk_level, approval_policy_id, status, created_at, decided_at)
         VALUES ($1, $2, $3, 'test-decision', 'raw', 'raw', 'critical', 'human-required',
                 'approved', $4, $4)`,
        [randomUUID(), workspaceId, original?.caseId, timestamp],
      ),
    ).rejects.toThrow(/approved Decision requires a matching human Approval/u);
  });

  it("database: a rejected or more-information Approval for Y does not satisfy the approved invariant", async () => {
    for (const outcome of ["rejected", "more-information-required"] as const) {
      const { workspaceId, decisionY } = await seedScenario();
      await insertRawApproval({
        id: randomUUID(),
        workspaceId,
        decisionId: decisionY,
        approver: "reviewer-a",
        outcome,
      });
      await expect(
        sql(`UPDATE decisions SET status = 'approved' WHERE id = $1 AND workspace_id = $2`, [
          decisionY,
          workspaceId,
        ]),
      ).rejects.toThrow(/approved Decision requires a matching human Approval/u);
      expect(await statusOf(workspaceId, decisionY)).toBe("awaiting-approval");
    }
  });

  it("database: replaying X's Approval id against Y is a primary-key violation", async () => {
    const { workspaceId, decisionX, decisionY } = await seedScenario();
    const { approval } = await approvalService().apply(workspaceId, decisionX, {
      identity: { type: "human", id: "reviewer-a" },
      outcome: "approved",
      comment: "Evidence reviewed for X only.",
    });

    await expect(
      insertRawApproval({
        id: approval.id,
        workspaceId,
        decisionId: decisionY,
        approver: approval.approver,
        outcome: "approved",
      }),
    ).rejects.toThrow(/duplicate key|unique/iu);
    expect(await statusOf(workspaceId, decisionY)).toBe("awaiting-approval");
  });

  it("database: an Approval cannot span workspaces (composite foreign key)", async () => {
    const a = await seedScenario();
    const b = await seedScenario();

    // workspace A's Approval row pointing at workspace B's Decision
    await expect(
      insertRawApproval({
        id: randomUUID(),
        workspaceId: a.workspaceId,
        decisionId: b.decisionX,
        approver: "reviewer-a",
        outcome: "approved",
      }),
    ).rejects.toThrow(/foreign key/iu);
    expect(await statusOf(b.workspaceId, b.decisionX)).toBe("awaiting-approval");
  });

  it("the repository API exposes no way to update or delete an Approval", () => {
    expect(Object.keys(repositories.approvals).sort()).toEqual(["findById", "insert", "list"]);
  });
});

describe("(b) an Approval needs an identified human approver", () => {
  const rejectedIdentities: Array<[string, { type: string; id: string }]> = [
    ["empty approver id", { type: "human", id: "" }],
    ["whitespace-only approver id", { type: "human", id: "   \t\n" }],
    ["system identity", { type: "system", id: "rule-engine" }],
    ["provider identity", { type: "provider", id: "fixture-intelligence-provider" }],
    ["system identity with an empty id", { type: "system", id: "" }],
  ];

  it.each(rejectedIdentities)(
    "application layer rejects %s and records nothing",
    async (_label, identity) => {
      const { workspaceId, decisionX } = await seedScenario();
      const auditBefore = await decisionAuditCount(workspaceId);

      await expect(
        approvalService().apply(workspaceId, decisionX, {
          identity: identity as never,
          outcome: "approved",
          comment: "Attempt without an identified human approver.",
        }),
      ).rejects.toThrow(/authenticated human session identity/u);

      expect(await repositories.approvals.list(workspaceId)).toEqual([]);
      expect(await statusOf(workspaceId, decisionX)).toBe("awaiting-approval");
      expect(await decisionAuditCount(workspaceId)).toBe(auditBefore);
    },
  );

  it("application layer rejects an absent identity", async () => {
    const { workspaceId, decisionX } = await seedScenario();
    await expect(
      approvalService().apply(workspaceId, decisionX, {
        identity: undefined as never,
        outcome: "approved",
        comment: "No identity at all.",
      }),
    ).rejects.toThrow();
    expect(await repositories.approvals.list(workspaceId)).toEqual([]);
    expect(await statusOf(workspaceId, decisionX)).toBe("awaiting-approval");
  });

  it("contract layer rejects an empty approver before it reaches the database", async () => {
    const { workspaceId, decisionX } = await seedScenario();
    await expect(
      repositories.approvals.insert(workspaceId, {
        id: randomUUID(),
        workspaceId,
        decisionId: decisionX,
        approver: "",
        outcome: "approved",
        comment: null,
        approvedAt: timestamp,
      }),
    ).rejects.toThrow();
    expect(await repositories.approvals.list(workspaceId)).toEqual([]);
  });

  it("database: a NULL approver is rejected by the NOT NULL constraint", async () => {
    const { workspaceId, decisionX } = await seedScenario();
    await expect(
      insertRawApproval({
        id: randomUUID(),
        workspaceId,
        decisionId: decisionX,
        approver: null as never,
        outcome: "approved",
      }),
    ).rejects.toThrow(/null value|not-null/iu);
  });
});

/**
 * Characterisation of what the database does NOT itself enforce. These pin
 * today's behaviour so docs/SECURITY.md 3.7 cannot claim more than the
 * schema delivers: they describe a writer with direct database privileges
 * (the application exposes no path to any of them, see the repository-API
 * test above). If a migration closes one of these gaps the matching test
 * must be inverted and the docs tightened.
 */
describe("database-level limits (characterisation, not endorsement)", () => {
  it("the schema has no CHECK on approver content: a raw empty-string approver row is accepted", async () => {
    const { workspaceId, decisionX } = await seedScenario();
    await insertRawApproval({
      id: randomUUID(),
      workspaceId,
      decisionId: decisionX,
      approver: "",
      outcome: "approved",
    });
    expect(
      (await sql(`SELECT count(*)::int AS n FROM approvals WHERE workspace_id = $1`, [workspaceId]))[0]?.["n"],
    ).toBe(1);
  });

  it("the approvals table is not append-only: a privileged writer can re-point an Approval at another Decision", async () => {
    const { workspaceId, decisionX, decisionY } = await seedScenario();
    const { approval } = await approvalService().apply(workspaceId, decisionX, {
      identity: { type: "human", id: "reviewer-a" },
      outcome: "approved",
      comment: "Evidence reviewed for X only.",
    });
    await sql(`UPDATE approvals SET decision_id = $1 WHERE id = $2 AND workspace_id = $3`, [
      decisionY,
      approval.id,
      workspaceId,
    ]);
    await sql(`UPDATE decisions SET status = 'approved' WHERE id = $1 AND workspace_id = $2`, [
      decisionY,
      workspaceId,
    ]);
    expect(await statusOf(workspaceId, decisionY)).toBe("approved");
  });
});
