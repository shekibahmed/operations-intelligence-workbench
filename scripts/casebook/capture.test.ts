import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { projectCapture, saveRecording } from "./capture.js";

const time = "2026-10-02T12:00:00.000Z";
// Synthetic examples of the real authenticated export projection, never public recording data.
function exportsInput() {
  const decision = { id: "decision-private", decisionType: "remove-from-service", proposal: "remove-from-service", riskLevel: "critical", approvalPolicyId: "asset-removal-approval", status: "awaiting-approval", decidedAt: null };
  const record = { id: "case-private", workspaceId: "workspace-private", caseType: "reliability-case", title: "A-142", status: "open", severity: "critical", priority: "urgent", owner: "maintenance-team", dueAt: time, relatedEventIds: ["event-private"], actionItems: [{ id: "action-private", actionType: "inspection", title: "Inspect", assignee: "maintenance-team", status: "open", dueAt: time, completedAt: null }], decisions: [decision], approvals: [] as unknown[] };
  const entry = (action: string, subjectId: string, data: object) => ({ id: action, workspaceId: record.workspaceId, occurredAt: time, actor: { type: action === "observation-accepted" || action === "decision-approved" ? "human" : "system", id: "session-private" }, subject: { type: action === "observation-accepted" ? "observation" : action === "rule-evaluated" ? "operational-event" : "decision", id: subjectId }, action, data });
  return {
    pending: { dataset: "cases", syntheticDataNotice: "Synthetic demo data only", records: [structuredClone(record)] },
    final: { dataset: "cases", syntheticDataNotice: "Synthetic demo data only", records: [{ ...record, decisions: [{ ...decision, status: "approved", decidedAt: time }], approvals: [{ id: "approval-private", decisionId: decision.id, approver: "session-private", outcome: "approved", comment: "Synthetic automated approval for demonstration only.", approvedAt: time }] }] },
    audit: { dataset: "audit", syntheticDataNotice: "Synthetic demo data only", records: [entry("observation-accepted", "observation-private", { schemaKey: "previous-repair-reference", previousReviewStatus: "pending", reviewStatus: "accepted" }), entry("rule-evaluated", "event-private", { ruleId: "safety-critical-removal-approval", ruleVersion: "1.0.0", result: true, condition: { kind: "all", result: true, children: [{ kind: "comparison", result: true, operator: "equals", expected: "safety-critical", fact: { exists: true, value: "safety-critical", fact: { kind: "observation", schemaKey: "severity-indicator", field: "value" }, relatedEventIds: [] } }, { kind: "comparison", result: true, operator: "greater-than-or-equal", expected: 2, fact: { exists: true, value: 4, fact: { kind: "aggregate", aggregate: "related-event-count", withinHours: 1440 }, relatedEventIds: ["event-private", "event-two", "event-three", "event-four"] } }] } }), entry("decision-proposed", decision.id, { caseId: record.id, ruleId: "safety-critical-removal-approval", ruleVersion: "1.0.0", riskLevel: "critical", approvalPolicyId: decision.approvalPolicyId }), entry("decision-approved", decision.id, { caseId: record.id, approvalId: "approval-private", previousDecisionStatus: "awaiting-approval", outcome: "approved" })] },
    stages: { fieldKey: "previous-repair-reference", confidence: "70%", excerpt: "it had brake work done back in the spring", pendingStatus: "Pending review", queueCleared: true, ruleId: "safety-critical-removal-approval", ruleVersion: "1.0.0", ruleEventId: "event-private", severityValue: "safety-critical", aggregateValue: 4, commentRequired: true, approvalComment: "Synthetic automated approval for demonstration only." },
  };
}

describe("casebook capture export boundary", () => {
  it("preserves the observed aggregate and outstanding work while removing private identifiers", () => {
    const result = projectCapture(exportsInput());
    expect(result.rule.relatedEventCount).toBe(4);
    expect(result.proposal.status).toBe("awaiting-approval");
    expect(result.approval.decisionRef).toBe(result.proposal.ref);
    expect(result.case.status).toBe("open");
    expect(result.case.actionItems[0]?.status).toBe("open");
    expect(JSON.stringify(result)).not.toMatch(/workspace-private|session-private|decision-private|case-private|event-private/);
  });

  it.each(["approval", "review", "reference"])("rejects missing or inconsistent %s evidence", (broken) => {
    const input = exportsInput();
    if (broken === "approval") input.final.records[0]!.approvals = [];
    if (broken === "review") input.audit.records = input.audit.records.filter((entry) => entry.action !== "observation-accepted");
    if (broken === "reference") input.final.records[0]!.approvals[0]!.decisionId = "another-decision";
    expect(() => projectCapture(input)).toThrow();
  });

  it("requires the real UI comment gate and matching displayed rule aggregate", () => {
    const input = exportsInput();
    input.stages.commentRequired = false;
    expect(() => projectCapture(input)).toThrow(/comment/i);
    input.stages.commentRequired = true;
    input.stages.aggregateValue = 2;
    expect(() => projectCapture(input)).toThrow(/aggregate/i);
  });

  it("preserves a prior recording when export validation fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "oiw-casebook-proof-"));
    const destination = join(directory, "recording.json");
    try {
      await writeFile(destination, "previous validated recording\n");
      const input = exportsInput();
      input.audit.records = [];
      await expect(saveRecording(destination, input, { sourceRevision: "a".repeat(40) })).rejects.toThrow();
      expect(await readFile(destination, "utf8")).toBe("previous validated recording\n");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
