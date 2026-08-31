import { resolve } from "node:path";
import type { ActionItem, Case, Decision, Signal } from "@oiw/contracts";
import { buildPackRegistry, type PackRegistryEntry } from "@oiw/scenario-sdk";
import { describe, expect, it } from "vitest";

import type { PackLabels } from "@/lib/pack-labels";
import { evaluateMetrics } from "@/lib/server/metrics";
import { fakeRepositories } from "./support/fake-repositories";

const WORKSPACE_ID = "workspace-1";
const BASE = "/w/workspace-1";

const LABELS: PackLabels = {
  packId: "asset-reliability",
  packName: "Asset Reliability",
  packDescription: "",
  entityTypes: {},
  eventTypes: {},
  signalTypes: { "repeated-fault": "Repeated Fault" },
  caseTypes: { "reliability-case": "Reliability Case" },
  actionTypes: {},
  decisionTypes: { "remove-from-service": "Remove From Service" },
  workflowStates: { open: "Open" },
  approvalPolicies: {},
};

/**
 * Points at the real asset-reliability pack directory, loaded through the
 * real `@oiw/scenario-sdk` registry (as `apps/web` does at runtime) so this
 * test evaluates the pack's actual validated `metricDefinitions` (v1.5), not
 * a hand-authored fixture that could drift from what the dashboards
 * actually reference.
 */
async function packEntry(): Promise<PackRegistryEntry> {
  const directory = resolve(process.cwd(), "..", "..", "scenario-packs");
  const registry = await buildPackRegistry(directory);
  const entry = registry.list().find((candidate) => candidate.id === "asset-reliability");
  if (entry === undefined) throw new Error("asset-reliability pack did not load for this test");
  return entry;
}

function baseCase(overrides: Partial<Case> = {}): Case {
  return {
    id: "case-1",
    workspaceId: WORKSPACE_ID,
    caseType: "reliability-case",
    title: "Reliability Case: fault-reported",
    status: "open",
    priority: "urgent",
    severity: "critical",
    owner: "maintenance-team",
    dueAt: "2026-09-06T00:00:00.000Z",
    relatedEntityIds: [],
    relatedEventIds: [],
    relatedSignalIds: [],
    closureRequirementIds: [],
    reEvaluationStatus: "current",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function baseSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    id: "signal-1",
    workspaceId: WORKSPACE_ID,
    signalType: "repeated-fault",
    severity: "critical",
    eventIds: ["event-1"],
    evidenceSegmentIds: ["segment-1"],
    rule: { id: "repeated-fault-escalation", version: "1.0.0" },
    rationale: "Repeat fault",
    createdAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function baseDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "decision-1",
    workspaceId: WORKSPACE_ID,
    caseId: "case-1",
    decisionType: "remove-from-service",
    proposal: "remove-from-service",
    rationale: "Repeat safety-critical fault",
    evidenceSegmentIds: ["segment-1"],
    riskLevel: "critical",
    approvalPolicyId: "asset-removal-approval",
    status: "awaiting-approval",
    createdAt: "2026-09-01T00:00:00.000Z",
    decidedAt: null,
    ...overrides,
  };
}

function baseActionItem(overrides: Partial<ActionItem> = {}): ActionItem {
  return {
    id: "action-1",
    workspaceId: WORKSPACE_ID,
    caseId: "case-1",
    actionType: "completion-inspection",
    title: "Schedule inspection for recurring fault",
    assignee: "maintenance-team",
    status: "open",
    dueAt: "2020-01-01T00:00:00.000Z", // far in the past — always overdue, deterministic
    completionEvidenceSegmentIds: [],
    completedAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("evaluateMetrics", () => {
  it("count-where: counts open cases via the real MetricEvaluationService and links real sample records", async () => {
    const repositories = fakeRepositories({
      cases: [baseCase(), baseCase({ id: "case-2", status: "closed" })],
    });
    const values = await evaluateMetrics(await packEntry(), repositories, WORKSPACE_ID, BASE, LABELS);

    const openCases = values.get("open-reliability-cases");
    expect(openCases?.kind).toBe("stat");
    if (openCases?.kind !== "stat") throw new Error("expected stat");
    expect(openCases.value).toBe(1); // the closed case is excluded
    expect(openCases.sampleRecords).toHaveLength(1);
    expect(openCases.sampleRecords[0]?.href).toBe(`${BASE}/cases/case-1`);
  });

  it("count-by-field: groups open cases by severity, excluding closed cases", async () => {
    const repositories = fakeRepositories({
      cases: [baseCase({ severity: "critical" }), baseCase({ id: "case-2", severity: "low", status: "closed" })],
    });
    const values = await evaluateMetrics(await packEntry(), repositories, WORKSPACE_ID, BASE, LABELS);

    const bySeverity = values.get("cases-by-severity");
    expect(bySeverity?.kind).toBe("breakdown");
    if (bySeverity?.kind !== "breakdown") throw new Error("expected breakdown");
    expect(bySeverity.entries).toEqual([{ key: "critical", label: "Critical", count: 1, href: `${BASE}/cases?severity=critical` }]);
  });

  it("sla-derived + format number: an overdue action item produces an overdue row linked to its real case", async () => {
    const repositories = fakeRepositories({ cases: [baseCase()], actionItems: [baseActionItem()] });
    const values = await evaluateMetrics(await packEntry(), repositories, WORKSPACE_ID, BASE, LABELS);

    const overdue = values.get("overdue-actions");
    expect(overdue?.kind).toBe("rows");
    if (overdue?.kind !== "rows") throw new Error("expected rows");
    expect(overdue.rows).toHaveLength(1);
    expect(overdue.rows[0]?.risk).toBe("overdue");
    expect(overdue.rows[0]?.href).toBe(`${BASE}/cases/case-1`);
  });

  it("sla-derived + format duration: averages the real distance to each matching case's own due date", async () => {
    const dueInFortyEightHours = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const repositories = fakeRepositories({ cases: [baseCase({ dueAt: dueInFortyEightHours })] });
    const values = await evaluateMetrics(await packEntry(), repositories, WORKSPACE_ID, BASE, LABELS);

    const triageTime = values.get("average-time-to-triage");
    expect(triageTime?.kind).toBe("stat");
    if (triageTime?.kind !== "stat") throw new Error("expected stat");
    // Tolerant of the small amount of real time elapsed between fixture setup and evaluation.
    expect(triageTime.value).toBeGreaterThan(47.9);
    expect(triageTime.value).toBeLessThan(48.1);
  });

  it("count-where over signals and decisions: counts critical signals and pending decisions independently", async () => {
    const repositories = fakeRepositories({
      signals: [baseSignal({ severity: "critical" }), baseSignal({ id: "signal-2", severity: "medium" })],
      decisions: [baseDecision({ status: "awaiting-approval" }), baseDecision({ id: "decision-2", status: "approved" })],
    });
    const values = await evaluateMetrics(await packEntry(), repositories, WORKSPACE_ID, BASE, LABELS);

    const criticalSignals = values.get("critical-signal-count");
    expect(criticalSignals?.kind).toBe("stat");
    if (criticalSignals?.kind !== "stat") throw new Error("expected stat");
    expect(criticalSignals.value).toBe(1);

    const pendingDecisions = values.get("pending-decision-count");
    expect(pendingDecisions?.kind).toBe("stat");
    if (pendingDecisions?.kind !== "stat") throw new Error("expected stat");
    expect(pendingDecisions.value).toBe(1);
    expect(pendingDecisions.sampleRecords[0]?.title).toContain("Remove From Service");
  });

  it("trend-over-time + format text: real audit entries, most recent first, linked to the audit explorer", async () => {
    const auditEntries = [
      { id: "audit-1", workspaceId: WORKSPACE_ID, occurredAt: "2026-09-01T00:00:00.000Z", cause: "First", action: "case-created", actor: { type: "system", id: "x" }, subject: { type: "case", id: "case-1" }, data: {}, previousEntryHash: null, entryHash: "h1" },
      { id: "audit-2", workspaceId: WORKSPACE_ID, occurredAt: "2026-09-02T00:00:00.000Z", cause: "Second", action: "decision-proposed", actor: { type: "system", id: "x" }, subject: { type: "decision", id: "decision-1" }, data: {}, previousEntryHash: null, entryHash: "h2" },
    ];
    const repositories = {
      ...fakeRepositories({}),
      auditEntries: { list: async () => auditEntries, findById: async () => null, insert: async (_w: unknown, value: unknown) => value },
    } as unknown as Parameters<typeof evaluateMetrics>[1];
    const values = await evaluateMetrics(await packEntry(), repositories, WORKSPACE_ID, BASE, LABELS);

    const activity = values.get("recent-reliability-activity");
    expect(activity?.kind).toBe("activity");
    if (activity?.kind !== "activity") throw new Error("expected activity");
    expect(activity.entries[0]?.summary).toBe("Second");
    expect(activity.entries[0]?.href).toBe(`${BASE}/audit?entry=audit-2#audit-2`);
  });

  it("count + hypothetical: never a bare number, scales an illustrative duration off real flagged signals", async () => {
    const repositories = fakeRepositories({ signals: [baseSignal({ severity: "critical" })] });
    const values = await evaluateMetrics(await packEntry(), repositories, WORKSPACE_ID, BASE, LABELS);

    const exposure = values.get("estimated-downtime-exposure");
    expect(exposure?.kind).toBe("text");
    expect(exposure?.classification).toBe("hypothetical");
    if (exposure?.kind !== "text") throw new Error("expected text");
    expect(exposure.value).toMatch(/^~\d+h$/);
  });
});
