import type { AuditEntry } from "@oiw/contracts";
import { describe, expect, it } from "vitest";

import { buildRuleTraceView, resolveOutcomes } from "@/lib/rule-trace";

function auditEntry(overrides: Partial<AuditEntry> & Pick<AuditEntry, "action" | "subject" | "data">): AuditEntry {
  return {
    id: `entry-${Math.random()}`,
    workspaceId: "workspace-1",
    occurredAt: "2026-05-18T09:00:00.000Z",
    actor: { type: "system", id: "rule-engine" },
    cause: "A rule fired",
    previousEntryHash: null,
    entryHash: "hash",
    ...overrides,
  };
}

const FIRED_CONDITION = {
  kind: "all",
  result: true,
  children: [
    {
      kind: "comparison",
      result: true,
      operator: "greater-than-or-equal",
      expected: 2,
      fact: {
        fact: { kind: "aggregate", aggregate: "related-event-count", eventType: "fault-reported", withinHours: 720 },
        exists: true,
        value: 2,
        relatedEventIds: ["event-a", "event-b"],
      },
    },
  ],
};

describe("buildRuleTraceView", () => {
  it("returns null when the rule was never evaluated", () => {
    expect(buildRuleTraceView([], "repeated-fault-escalation")).toBeNull();
  });

  it("builds fact rows and a display condition tree from a matched evaluation", () => {
    const entries: AuditEntry[] = [
      auditEntry({
        action: "rule-evaluated",
        subject: { type: "operational-event", id: "event-current" },
        cause: "Escalate repeated faults",
        data: {
          ruleId: "repeated-fault-escalation",
          ruleVersion: "1.0.0",
          result: true,
          condition: FIRED_CONDITION,
          firedActions: [{ type: "create-signal", definitionId: "repeated-fault", parameters: { severity: "critical" } }],
          rationale: "Escalate repeated faults",
          referencedEventIds: ["event-current", "event-a", "event-b"],
        },
      }),
    ];

    const view = buildRuleTraceView(entries, "repeated-fault-escalation");
    expect(view).not.toBeNull();
    expect(view?.result).toBe(true);
    expect(view?.eventId).toBe("event-current");
    expect(view?.facts).toHaveLength(1);
    expect(view?.facts[0]?.resolvedValue).toBe("2");
    expect(view?.condition.result).toBe(true);
    expect(view?.condition.children[0]?.label).toContain("related-event-count");
  });

  it("prefers the most recent fired evaluation when no eventId is given", () => {
    const notFired = auditEntry({
      action: "rule-evaluated",
      occurredAt: "2026-05-18T08:00:00.000Z",
      subject: { type: "operational-event", id: "event-earlier" },
      data: {
        ruleId: "repeated-fault-escalation",
        ruleVersion: "1.0.0",
        result: false,
        condition: { kind: "comparison", result: false, operator: "exists", expected: null, fact: { fact: { kind: "event-field", field: "eventType" }, exists: false, value: null, relatedEventIds: [] } },
        firedActions: [],
        rationale: "Did not match",
        referencedEventIds: ["event-earlier"],
      },
    });
    const fired = auditEntry({
      action: "rule-evaluated",
      occurredAt: "2026-05-18T09:00:00.000Z",
      subject: { type: "operational-event", id: "event-current" },
      data: {
        ruleId: "repeated-fault-escalation",
        ruleVersion: "1.0.0",
        result: true,
        condition: FIRED_CONDITION,
        firedActions: [],
        rationale: "Matched",
        referencedEventIds: ["event-current"],
      },
    });

    const view = buildRuleTraceView([notFired, fired], "repeated-fault-escalation");
    expect(view?.eventId).toBe("event-current");
  });

  it("selects the evaluation for a specific eventId when given", () => {
    const first = auditEntry({
      action: "rule-evaluated",
      subject: { type: "operational-event", id: "event-a" },
      data: { ruleId: "r", ruleVersion: "1.0.0", result: true, condition: FIRED_CONDITION, firedActions: [], rationale: "x", referencedEventIds: [] },
    });
    const second = auditEntry({
      action: "rule-evaluated",
      subject: { type: "operational-event", id: "event-b" },
      data: { ruleId: "r", ruleVersion: "1.0.0", result: true, condition: FIRED_CONDITION, firedActions: [], rationale: "y", referencedEventIds: [] },
    });

    const view = buildRuleTraceView([first, second], "r", "event-b");
    expect(view?.eventId).toBe("event-b");
    expect(view?.rationale).toBe("y");
  });
});

describe("resolveOutcomes", () => {
  it("describes a real create-signal outcome via its matching signal-created entry", () => {
    const evaluation = auditEntry({
      action: "rule-evaluated",
      subject: { type: "operational-event", id: "event-current" },
      data: {
        ruleId: "repeated-fault-escalation",
        ruleVersion: "1.0.0",
        result: true,
        condition: FIRED_CONDITION,
        firedActions: [{ type: "create-signal", definitionId: "repeated-fault", parameters: {} }],
        rationale: "Escalate",
        referencedEventIds: ["event-current"],
      },
    });
    const signalCreated = auditEntry({
      action: "signal-created",
      subject: { type: "signal", id: "signal-1" },
      data: { ruleId: "repeated-fault-escalation", ruleVersion: "1.0.0", eventIds: ["event-current"], signalType: "repeated-fault", severity: "critical" },
    });

    const view = buildRuleTraceView([evaluation], "repeated-fault-escalation")!;
    const outcomes = resolveOutcomes(view, [evaluation, signalCreated]);

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]?.integrationPoint).toBe(false);
    expect(outcomes[0]?.description).toContain("repeated-fault");
    expect(outcomes[0]?.auditEntryId).toBe(signalCreated.id);
  });

  it("describes a real propose-decision outcome via its matching decision-proposed entry", () => {
    const evaluation = auditEntry({
      action: "rule-evaluated",
      subject: { type: "operational-event", id: "event-current" },
      data: {
        ruleId: "safety-critical-removal-approval",
        ruleVersion: "1.0.0",
        result: true,
        condition: FIRED_CONDITION,
        firedActions: [{ type: "propose-decision", definitionId: "remove-from-service", parameters: {} }],
        rationale: "Hold from service",
        referencedEventIds: ["event-current"],
      },
    });
    const proposed = auditEntry({
      action: "decision-proposed",
      subject: { type: "decision", id: "decision-1" },
      data: {
        caseId: "case-1",
        ruleId: "safety-critical-removal-approval",
        ruleVersion: "1.0.0",
        riskLevel: "critical",
        approvalPolicyId: "asset-removal-approval",
      },
    });

    const view = buildRuleTraceView([evaluation], "safety-critical-removal-approval")!;
    const outcomes = resolveOutcomes(view, [evaluation, proposed]);

    expect(outcomes[0]?.integrationPoint).toBe(false);
    expect(outcomes[0]?.description).toContain("critical");
    expect(outcomes[0]?.auditEntryId).toBe(proposed.id);
  });

  it("marks a genuinely unrecognized action type as an integration point", () => {
    const evaluation = auditEntry({
      action: "rule-evaluated",
      subject: { type: "operational-event", id: "event-current" },
      data: {
        ruleId: "some-future-rule",
        ruleVersion: "1.0.0",
        result: true,
        condition: FIRED_CONDITION,
        firedActions: [{ type: "some-future-action-type", definitionId: "unknown", parameters: {} }],
        rationale: "Hypothetical future action",
        referencedEventIds: ["event-current"],
      },
    });

    const view = buildRuleTraceView([evaluation], "some-future-rule")!;
    const outcomes = resolveOutcomes(view, [evaluation]);

    expect(outcomes[0]?.integrationPoint).toBe(true);
    expect(outcomes[0]?.description).toContain("Unrecognized action type");
    expect(outcomes[0]?.auditEntryId).toBeNull();
  });
});
