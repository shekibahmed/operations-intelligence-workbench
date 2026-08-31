import type {
  ActionItem,
  Approval,
  AuditEntry,
  Case,
  CaseDefinition,
  Decision,
  Observation,
  OperationalEvent,
  Signal,
  WorkflowDefinition,
} from "@oiw/contracts";
import { describe, expect, it } from "vitest";

import {
  CaseLifecycleService,
  zeroRuleAggregates,
  type CaseLifecycleRepositories,
} from "./case-lifecycle.js";
import type { RuleEvaluatorPort } from "./rule-execution.js";

const workspaceId = "00000000-0000-4000-8000-000000000001";
const caseId = "00000000-0000-4000-8000-000000000002";
const eventId = "00000000-0000-4000-8000-000000000003";
const observationId = "00000000-0000-4000-8000-000000000004";
const actionId = "00000000-0000-4000-8000-000000000005";
const timestamp = "2026-09-01T00:00:00.000Z";

const workflow: WorkflowDefinition = {
  id: "default",
  version: "1.0.0",
  initialState: "open",
  states: [
    { id: "open", label: "Open", terminal: false },
    { id: "ready", label: "Ready", terminal: false },
    { id: "closed", label: "Closed", terminal: true },
  ],
  transitions: [
    {
      id: "start",
      from: "open",
      to: "ready",
      guard: {
        fact: { kind: "event-field", field: "eventType" },
        operator: "equals",
        value: "qualifying-event",
      },
    },
    { id: "close", from: "ready", to: "closed" },
  ],
  closureRequirements: [
    {
      id: "work-complete",
      type: "action-completed",
      definitionId: "required-work",
      description: "Required work must complete.",
    },
  ],
};

const caseDefinition: CaseDefinition = {
  caseType: "example-case",
  displayName: { singular: "Example Case", plural: "Example Cases" },
  description: "Neutral workflow test Case.",
  workflowId: "default",
  defaultPriority: "normal",
  defaultSeverity: "medium",
  defaultOwner: null,
  defaultDueInHours: null,
  closureRequirements: ["work-complete"],
  triggeredByRules: ["qualifying-rule"],
};

const event: OperationalEvent = {
  id: eventId,
  workspaceId,
  eventType: "qualifying-event",
  occurredAt: timestamp,
  recordedAt: timestamp,
  entityIds: [],
  observationIds: [observationId],
  attributes: {},
  assembly: { assemblerId: "test-assembler", assemblerVersion: "1.0.0" },
  reEvaluationStatus: "current",
};

const observation: Observation = {
  id: observationId,
  artifactId: "00000000-0000-4000-8000-000000000006",
  entityId: null,
  schemaKey: "finding",
  value: "present",
  normalisedValue: "present",
  derivation: "human",
  evidenceStatus: "supported",
  evidenceSegmentId: "00000000-0000-4000-8000-000000000007",
  confidence: null,
  extractor: null,
  insufficiencyReason: null,
  reviewStatus: "accepted",
  reviewedBy: "reviewer",
  reviewedAt: timestamp,
  createdAt: timestamp,
};

function memoryRepositories() {
  const records: {
    cases: Case[];
    actionItems: ActionItem[];
    decisions: Decision[];
    approvals: Approval[];
    observations: Observation[];
    operationalEvents: OperationalEvent[];
    signals: Signal[];
    auditEntries: AuditEntry[];
  } = {
    cases: [
      {
        id: caseId,
        workspaceId,
        caseType: "example-case",
        title: "Example Case",
        status: "open",
        priority: "normal",
        severity: "medium",
        owner: null,
        dueAt: null,
        relatedEntityIds: [],
        relatedEventIds: [eventId],
        relatedSignalIds: [],
        closureRequirementIds: ["work-complete"],
        reEvaluationStatus: "current",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    actionItems: [
      {
        id: actionId,
        workspaceId,
        caseId,
        actionType: "required-work",
        title: "Complete required work",
        assignee: "operator",
        status: "open",
        dueAt: null,
        completionEvidenceSegmentIds: [],
        completedAt: null,
        createdAt: timestamp,
      },
    ],
    decisions: [],
    approvals: [],
    observations: [observation],
    operationalEvents: [event],
    signals: [],
    auditEntries: [],
  };

  function scoped<T extends { id: string }>(values: T[]) {
    return {
      async insert(_workspaceId: string, value: T) {
        values.push(value);
        return value;
      },
      async findById(_workspaceId: string, id: string) {
        return values.find((value) => value.id === id) ?? null;
      },
      async list() {
        return [...values];
      },
    };
  }

  const caseRepository = scoped(records.cases);
  const repositories: CaseLifecycleRepositories = {
    cases: {
      ...caseRepository,
      async update(_workspaceId, id, value) {
        const index = records.cases.findIndex((entry) => entry.id === id);
        if (index < 0) return null;
        records.cases[index] = value;
        return value;
      },
    },
    actionItems: scoped(records.actionItems),
    decisions: scoped(records.decisions),
    approvals: scoped(records.approvals),
    observations: scoped(records.observations),
    operationalEvents: scoped(records.operationalEvents),
    signals: scoped(records.signals),
    auditEntries: scoped(records.auditEntries),
  };
  return { records, repositories };
}

function transitionContext(eventOverride: OperationalEvent = event) {
  return {
    event: eventOverride,
    observations: [observation],
    events: [eventOverride],
    aggregates: zeroRuleAggregates(),
  };
}

const factCatalogueEvaluator: RuleEvaluatorPort = {
  evaluate(rule, context) {
    const result = context.event.eventType === "qualifying-event";
    return {
      ruleId: rule.id,
      ruleVersion: rule.version,
      eventId: context.event.id,
      result,
      condition: { fact: "eventType", value: context.event.eventType, result },
      firedActions: [],
      rationale: rule.description,
      referencedEventIds: [context.event.id],
    };
  },
};

describe("CaseLifecycleService", () => {
  it("enforces fact-catalogue guards and rejects prohibited transitions", async () => {
    const { repositories } = memoryRepositories();
    const service = new CaseLifecycleService(repositories, factCatalogueEvaluator, () => new Date(timestamp));
    const pack = { caseDefinitions: new Map([[caseDefinition.caseType, caseDefinition]]), workflows: { default: workflow } };

    await expect(
      service.transitionCase(workspaceId, pack, caseId, "closed", {
        actor: { type: "system", id: "test" },
        cause: "Attempt prohibited shortcut",
      }),
    ).rejects.toThrow('Transition from "open" to "closed" is not permitted');
    await expect(
      service.transitionCase(workspaceId, pack, caseId, "ready", {
        actor: { type: "system", id: "test" },
        cause: "Wrong fact",
        factContext: transitionContext({ ...event, eventType: "other-event" }),
      }),
    ).rejects.toThrow('Transition guard "start" was not satisfied');

    await expect(
      service.transitionCase(workspaceId, pack, caseId, "ready", {
        actor: { type: "system", id: "test" },
        cause: "Qualifying fact",
        factContext: transitionContext(),
      }),
    ).resolves.toMatchObject({ status: "ready" });
  });

  it("blocks closure until requirements pass and treats terminal states as final", async () => {
    const { records, repositories } = memoryRepositories();
    records.cases[0] = { ...records.cases[0]!, status: "ready" };
    const service = new CaseLifecycleService(repositories, factCatalogueEvaluator, () => new Date(timestamp));
    const pack = { caseDefinitions: new Map([[caseDefinition.caseType, caseDefinition]]), workflows: { default: workflow } };

    await expect(
      service.transitionCase(workspaceId, pack, caseId, "closed", {
        actor: { type: "human", id: "operator" },
        cause: "Premature closure",
      }),
    ).rejects.toThrow("work-complete");
    records.actionItems[0] = {
      ...records.actionItems[0]!,
      status: "completed",
      completedAt: timestamp,
    };
    await expect(
      service.transitionCase(workspaceId, pack, caseId, "closed", {
        actor: { type: "human", id: "operator" },
        cause: "Requirements satisfied",
      }),
    ).resolves.toMatchObject({ status: "closed" });
    await expect(
      service.transitionCase(workspaceId, pack, caseId, "closed", {
        actor: { type: "human", id: "operator" },
        cause: "Second closure",
      }),
    ).rejects.toThrow("already in terminal state");
    expect(records.auditEntries).toHaveLength(1);
    expect(records.auditEntries[0]).toMatchObject({ action: "case-transitioned" });
  });

  it("evaluates every closure-requirement kind from related operational state", async () => {
    const { records, repositories } = memoryRepositories();
    const evidenceWorkflow: WorkflowDefinition = {
      ...workflow,
      closureRequirements: [
        ...workflow.closureRequirements,
        {
          id: "evidence-filed",
          type: "evidence-present",
          definitionId: "finding",
          description: "Finding evidence is required.",
        },
        {
          id: "decision-approved",
          type: "decision-approved",
          definitionId: "accept-proposal",
          description: "The proposal must be approved.",
        },
        {
          id: "review-finished",
          type: "observation-reviewed",
          definitionId: "finding",
          description: "The finding must be reviewed.",
        },
      ],
    };
    records.cases[0] = {
      ...records.cases[0]!,
      closureRequirementIds: evidenceWorkflow.closureRequirements.map(({ id }) => id),
    };
    records.actionItems[0] = {
      ...records.actionItems[0]!,
      status: "completed",
      completedAt: timestamp,
    };
    records.decisions.push({
      id: "00000000-0000-4000-8000-000000000008",
      workspaceId,
      caseId,
      decisionType: "accept-proposal",
      proposal: "Accept the proposal",
      rationale: "Reviewed evidence supports it.",
      evidenceSegmentIds: [observation.evidenceSegmentId!],
      riskLevel: "high",
      approvalPolicyId: "human-approval",
      status: "approved",
      createdAt: timestamp,
      decidedAt: timestamp,
    });
    const service = new CaseLifecycleService(repositories, factCatalogueEvaluator, () => new Date(timestamp));

    await expect(
      service.unmetClosureRequirements(workspaceId, records.cases[0]!, evidenceWorkflow),
    ).resolves.toEqual([]);
    records.observations[0] = {
      ...records.observations[0]!,
      evidenceSegmentId: null,
      reviewStatus: "pending",
    };
    records.actionItems[0] = {
      ...records.actionItems[0]!,
      status: "open",
      completedAt: null,
    };
    records.decisions[0] = {
      ...records.decisions[0]!,
      status: "awaiting-approval",
      decidedAt: null,
    };
    await expect(
      service.unmetClosureRequirements(workspaceId, records.cases[0]!, evidenceWorkflow),
    ).resolves.toEqual([
      "work-complete",
      "evidence-filed",
      "decision-approved",
      "review-finished",
    ]);
  });

  it("requires a matching Approval record for approval-gated transitions", async () => {
    const { records, repositories } = memoryRepositories();
    records.cases[0] = {
      ...records.cases[0]!,
      status: "ready",
      closureRequirementIds: [],
    };
    const approvalWorkflow: WorkflowDefinition = {
      ...workflow,
      transitions: [
        {
          id: "approve-close",
          from: "ready",
          to: "closed",
          requiresApprovalPolicyId: "human-approval",
        },
      ],
      closureRequirements: [],
    };
    const decisionId = "00000000-0000-4000-8000-000000000008";
    records.decisions.push({
      id: decisionId,
      workspaceId,
      caseId,
      decisionType: "accept-proposal",
      proposal: "Accept the proposal",
      rationale: "Reviewed evidence supports it.",
      evidenceSegmentIds: [observation.evidenceSegmentId!],
      riskLevel: "high",
      approvalPolicyId: "human-approval",
      status: "approved",
      createdAt: timestamp,
      decidedAt: timestamp,
    });
    const service = new CaseLifecycleService(repositories, factCatalogueEvaluator, () => new Date(timestamp));
    const pack = {
      caseDefinitions: new Map([[caseDefinition.caseType, caseDefinition]]),
      workflows: { default: approvalWorkflow },
    };

    await expect(
      service.transitionCase(workspaceId, pack, caseId, "closed", {
        actor: { type: "human", id: "approver" },
        cause: "Approval claimed without record",
      }),
    ).rejects.toThrow("recorded human Approval");
    records.approvals.push({
      id: "00000000-0000-4000-8000-000000000009",
      workspaceId,
      decisionId,
      approver: "approver",
      outcome: "approved",
      comment: null,
      approvedAt: timestamp,
    });
    await expect(
      service.transitionCase(workspaceId, pack, caseId, "closed", {
        actor: { type: "human", id: "approver" },
        cause: "Recorded Approval satisfies policy",
      }),
    ).resolves.toMatchObject({ status: "closed" });
  });
});
