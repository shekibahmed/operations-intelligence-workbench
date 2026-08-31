import type { ActionItem, Approval, ArtifactSegment, Case, Decision, Entity, OperationalEvent, Signal } from "@oiw/contracts";
import { describe, expect, it } from "vitest";

import { buildCaseDetailView } from "@/lib/case-detail";
import { fakeRepositories } from "./support/fake-repositories";

const WORKSPACE_ID = "workspace-1";

function baseCase(overrides: Partial<Case> = {}): Case {
  return {
    id: "case-1",
    workspaceId: WORKSPACE_ID,
    caseType: "reliability-case",
    title: "Repeat brake-assembly fault",
    status: "open",
    priority: "high",
    severity: "high",
    owner: null,
    dueAt: null,
    relatedEntityIds: ["entity-1"],
    relatedEventIds: ["event-1"],
    relatedSignalIds: ["signal-1"],
    closureRequirementIds: ["inspection-completed", "decision-resolved"],
    reEvaluationStatus: "current",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function entity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: "entity-1",
    workspaceId: WORKSPACE_ID,
    entityType: "asset",
    displayName: "A-140",
    externalReference: "A-140",
    aliases: [],
    attributes: {},
    status: "operational",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function event(overrides: Partial<OperationalEvent> = {}): OperationalEvent {
  return {
    id: "event-1",
    workspaceId: WORKSPACE_ID,
    eventType: "fault-reported",
    occurredAt: "2026-05-01T00:00:00.000Z",
    recordedAt: "2026-05-01T00:00:00.000Z",
    entityIds: ["entity-1"],
    observationIds: ["obs-1"],
    attributes: {},
    assembly: { assemblerId: "event-assembly", assemblerVersion: "1.0.0" },
    reEvaluationStatus: "current",
    ...overrides,
  };
}

function signal(overrides: Partial<Signal> = {}): Signal {
  return {
    id: "signal-1",
    workspaceId: WORKSPACE_ID,
    signalType: "repeated-fault",
    severity: "critical",
    eventIds: ["event-1"],
    evidenceSegmentIds: ["segment-1"],
    rule: { id: "repeated-fault-escalation", version: "1.0.0" },
    rationale: "Two related faults within 30 days",
    createdAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildCaseDetailView", () => {
  it("returns null for a case that does not exist", async () => {
    const repositories = fakeRepositories({ cases: [] });
    expect(await buildCaseDetailView(repositories, WORKSPACE_ID, "missing")).toBeNull();
  });

  it("assembles related entities, timeline and signals for a real case", async () => {
    const repositories = fakeRepositories({
      cases: [baseCase()],
      entities: [entity()],
      operationalEvents: [event()],
      signals: [signal()],
      actionItems: [],
      decisions: [],
      approvals: [],
      artifactSegments: [
        {
          id: "segment-1",
          artifactId: "artifact-1",
          locator: { kind: "text-range", start: 0, end: 1 },
          excerpt: "grinding noise",
          checksum: null,
          createdAt: "2026-05-01T00:00:00.000Z",
        } satisfies ArtifactSegment,
      ],
    });

    const view = await buildCaseDetailView(repositories, WORKSPACE_ID, "case-1");

    expect(view).not.toBeNull();
    expect(view?.relatedEntities).toEqual([{ id: "entity-1", name: "A-140" }]);
    expect(view?.timeline.map((e) => e.id)).toEqual(["event-1"]);
    expect(view?.signals.map((s) => s.id)).toEqual(["signal-1"]);
    expect(view?.evidence.map((s) => s.id)).toEqual(["segment-1"]);
  });

  it("marks an event-typed closure requirement complete once that event type appears in the timeline", async () => {
    const repositories = fakeRepositories({
      cases: [baseCase()],
      entities: [entity()],
      operationalEvents: [event({ eventType: "inspection-completed" })],
      signals: [],
      decisions: [],
      approvals: [],
    });

    const view = await buildCaseDetailView(repositories, WORKSPACE_ID, "case-1");
    const inspection = view?.closureRequirements.find((r) => r.id === "inspection-completed");
    expect(inspection?.complete).toBe(true);
    expect(inspection?.label).toBe("Inspection Completed");
  });

  it("marks a decision-referencing closure requirement complete once every Decision is resolved", async () => {
    const decision: Decision = {
      id: "decision-1",
      workspaceId: WORKSPACE_ID,
      caseId: "case-1",
      decisionType: "remove-from-service",
      proposal: "Hold asset from service",
      rationale: "Repeated safety-critical fault",
      evidenceSegmentIds: ["segment-1"],
      riskLevel: "critical",
      approvalPolicyId: "asset-removal-approval",
      status: "approved",
      createdAt: "2026-05-01T00:00:00.000Z",
      decidedAt: "2026-05-02T00:00:00.000Z",
    };
    const approval: Approval = {
      id: "approval-1",
      workspaceId: WORKSPACE_ID,
      decisionId: "decision-1",
      approver: "guest-1",
      outcome: "approved",
      comment: "Confirmed unsafe to operate",
      approvedAt: "2026-05-02T00:00:00.000Z",
    };

    const repositories = fakeRepositories({
      cases: [baseCase()],
      entities: [entity()],
      operationalEvents: [event()],
      signals: [],
      decisions: [decision],
      approvals: [approval],
    });

    const view = await buildCaseDetailView(repositories, WORKSPACE_ID, "case-1");
    expect(view?.decisions.map((d) => d.id)).toEqual(["decision-1"]);
    expect(view?.approvals.map((a) => a.id)).toEqual(["approval-1"]);
    const resolved = view?.closureRequirements.find((r) => r.id === "decision-resolved");
    expect(resolved?.complete).toBe(true);
  });

  it("leaves a decision-referencing requirement unsatisfied while a Decision is still pending", async () => {
    const decision: Decision = {
      id: "decision-1",
      workspaceId: WORKSPACE_ID,
      caseId: "case-1",
      decisionType: "remove-from-service",
      proposal: "Hold asset from service",
      rationale: "Repeated safety-critical fault",
      evidenceSegmentIds: ["segment-1"],
      riskLevel: "critical",
      approvalPolicyId: "asset-removal-approval",
      status: "awaiting-approval",
      createdAt: "2026-05-01T00:00:00.000Z",
      decidedAt: null,
    };
    const repositories = fakeRepositories({
      cases: [baseCase()],
      entities: [entity()],
      operationalEvents: [event()],
      signals: [],
      decisions: [decision],
      approvals: [],
    });

    const view = await buildCaseDetailView(repositories, WORKSPACE_ID, "case-1");
    const resolved = view?.closureRequirements.find((r) => r.id === "decision-resolved");
    expect(resolved?.complete).toBe(false);
  });

  it("excludes unrelated ActionItems, Decisions and Approvals from another Case", async () => {
    const unrelatedActionItem: ActionItem = {
      id: "action-1",
      workspaceId: WORKSPACE_ID,
      caseId: "other-case",
      actionType: "completion-inspection",
      title: "Unrelated action",
      assignee: null,
      status: "open",
      dueAt: null,
      completionEvidenceSegmentIds: [],
      completedAt: null,
      createdAt: "2026-05-01T00:00:00.000Z",
    };
    const repositories = fakeRepositories({
      cases: [baseCase()],
      entities: [entity()],
      operationalEvents: [event()],
      signals: [],
      actionItems: [unrelatedActionItem],
      decisions: [],
      approvals: [],
    });

    const view = await buildCaseDetailView(repositories, WORKSPACE_ID, "case-1");
    expect(view?.actionItems).toEqual([]);
  });
});
