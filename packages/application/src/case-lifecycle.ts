import type {
  ActionItem,
  Approval,
  Case,
  CaseDefinition,
  Decision,
  Observation,
  OperationalEvent,
  RuleDefinition,
  Signal,
  WorkflowDefinition,
} from "@oiw/contracts";

import {
  appendOperationalAudit,
  type OperationalAuditRepository,
} from "./operational-audit.js";
import { deterministicUuid } from "./records.js";
import type {
  RuleAggregateValues,
  RuleEvaluatorContext,
  RuleEvaluatorPort,
} from "./rule-execution.js";

interface ScopedRepository<T> {
  insert(workspaceId: string, value: T): Promise<T>;
  findById(workspaceId: string, id: string): Promise<T | null>;
  list(workspaceId: string): Promise<T[]>;
}

export interface CaseLifecycleRepositories {
  cases: ScopedRepository<Case> & {
    update(workspaceId: string, caseId: string, value: Case): Promise<Case | null>;
  };
  actionItems: ScopedRepository<ActionItem>;
  decisions: ScopedRepository<Decision>;
  approvals: ScopedRepository<Approval>;
  observations: ScopedRepository<Observation>;
  operationalEvents: ScopedRepository<OperationalEvent>;
  signals: ScopedRepository<Signal>;
  auditEntries: OperationalAuditRepository;
}

export interface CaseLifecyclePack {
  caseDefinitions: ReadonlyMap<string, CaseDefinition>;
  workflows: Record<string, WorkflowDefinition>;
}

export interface CaseRuleContext {
  event: OperationalEvent;
  observations: readonly Observation[];
  rule: RuleDefinition;
  parameters?: Record<string, unknown>;
}

export type CaseTransitionFactContext = RuleEvaluatorContext;

const severityOrder: Record<Case["severity"], number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const priorityOrder: Record<Case["priority"], number> = {
  low: 0,
  normal: 1,
  high: 2,
  urgent: 3,
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function intersects(left: readonly string[], right: readonly string[]): boolean {
  const values = new Set(left);
  return right.some((value) => values.has(value));
}

function highestSeverity(values: readonly Case["severity"][]): Case["severity"] {
  return values.reduce((highest, value) =>
    severityOrder[value] > severityOrder[highest] ? value : highest,
  "info");
}

function highestPriority(values: readonly Case["priority"][]): Case["priority"] {
  return values.reduce((highest, value) =>
    priorityOrder[value] > priorityOrder[highest] ? value : highest,
  "low");
}

function priorityForSeverity(severity: Case["severity"]): Case["priority"] {
  if (severity === "critical") return "urgent";
  if (severity === "high") return "high";
  return "normal";
}

function stringParameter(parameters: Record<string, unknown>, key: string): string | null {
  const value = parameters[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numericParameter(parameters: Record<string, unknown>, key: string): number | null {
  const value = parameters[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function severityParameter(
  parameters: Record<string, unknown>,
  fallback: Case["severity"],
): Case["severity"] {
  const value = parameters["defaultSeverity"] ?? parameters["severity"];
  return typeof value === "string" && value in severityOrder
    ? (value as Case["severity"])
    : fallback;
}

function priorityParameter(
  parameters: Record<string, unknown>,
  fallback: Case["priority"],
): Case["priority"] {
  const value = parameters["defaultPriority"] ?? parameters["priority"];
  return typeof value === "string" && value in priorityOrder
    ? (value as Case["priority"])
    : fallback;
}

export class CaseLifecycleService {
  constructor(
    private readonly repositories: CaseLifecycleRepositories,
    private readonly ruleEvaluator: RuleEvaluatorPort,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async ensureCasesForRule(
    workspaceId: string,
    pack: CaseLifecyclePack,
    context: CaseRuleContext,
  ): Promise<Case[]> {
    const definitions = [...pack.caseDefinitions.values()].filter((definition) =>
      definition.triggeredByRules.includes(context.rule.id),
    );
    return Promise.all(
      definitions.map((definition) =>
        this.ensureCase(workspaceId, pack, definition, context),
      ),
    );
  }

  async ensureCaseForAction(
    workspaceId: string,
    pack: CaseLifecyclePack,
    caseType: string,
    context: CaseRuleContext,
  ): Promise<Case> {
    const definition = pack.caseDefinitions.get(caseType);
    if (definition === undefined) {
      throw new Error(`Rule action references unknown Case definition "${caseType}"`);
    }
    return this.ensureCase(workspaceId, pack, definition, context);
  }

  async findRelatedCase(
    workspaceId: string,
    event: OperationalEvent,
    caseType?: string,
  ): Promise<Case | null> {
    const candidates = (await this.repositories.cases.list(workspaceId)).filter(
      (caseRecord) =>
        (caseType === undefined || caseRecord.caseType === caseType) &&
        (caseRecord.relatedEventIds.includes(event.id) ||
          intersects(caseRecord.relatedEntityIds, event.entityIds)),
    );
    return candidates.at(0) ?? null;
  }

  async reconcileRelatedState(
    workspaceId: string,
    caseRecord: Case,
    event: OperationalEvent,
  ): Promise<Case> {
    const signals = (await this.repositories.signals.list(workspaceId)).filter((signal) =>
      signal.eventIds.includes(event.id),
    );
    const severity = highestSeverity([caseRecord.severity, ...signals.map(({ severity }) => severity)]);
    const priority = highestPriority([caseRecord.priority, priorityForSeverity(severity)]);
    const updated: Case = {
      ...caseRecord,
      severity,
      priority,
      relatedEntityIds: unique([...caseRecord.relatedEntityIds, ...event.entityIds]),
      relatedEventIds: unique([...caseRecord.relatedEventIds, event.id]),
      relatedSignalIds: unique([
        ...caseRecord.relatedSignalIds,
        ...signals.map(({ id }) => id),
      ]),
      updatedAt: this.clock().toISOString(),
    };
    const currentState = { ...caseRecord, updatedAt: "" };
    const nextState = { ...updated, updatedAt: "" };
    if (JSON.stringify(nextState) === JSON.stringify(currentState)) return caseRecord;
    return (await this.repositories.cases.update(workspaceId, caseRecord.id, updated)) ?? updated;
  }

  async transitionCase(
    workspaceId: string,
    pack: CaseLifecyclePack,
    caseId: string,
    targetState: string,
    input: {
      actor: { type: "human" | "system"; id: string };
      cause: string;
      factContext?: CaseTransitionFactContext;
    },
  ): Promise<Case> {
    const caseRecord = await this.repositories.cases.findById(workspaceId, caseId);
    if (caseRecord === null) throw new Error(`Case "${caseId}" was not found`);
    const definition = pack.caseDefinitions.get(caseRecord.caseType);
    if (definition === undefined) {
      throw new Error(`Case "${caseId}" has unknown Case definition "${caseRecord.caseType}"`);
    }
    const workflow = pack.workflows[definition.workflowId];
    if (workflow === undefined) throw new Error(`Workflow "${definition.workflowId}" was not found`);
    if (workflow.states.find(({ id }) => id === caseRecord.status)?.terminal === true) {
      throw new Error(`Case "${caseId}" is already in terminal state "${caseRecord.status}"`);
    }
    const transition = workflow.transitions.find(
      ({ from, to }) => from === caseRecord.status && to === targetState,
    );
    if (transition === undefined) {
      throw new Error(
        `Transition from "${caseRecord.status}" to "${targetState}" is not permitted`,
      );
    }
    if (transition.guard !== undefined) {
      if (input.factContext === undefined) {
        throw new Error(`Transition "${transition.id}" requires fact-catalogue context`);
      }
      const trace = this.ruleEvaluator.evaluate(
        {
          id: `workflow-${transition.id}`,
          version: workflow.version,
          description: `Workflow guard for ${transition.id}`,
          when: transition.guard,
          then: [],
        },
        input.factContext,
      );
      if (!trace.result) throw new Error(`Transition guard "${transition.id}" was not satisfied`);
    }
    if (transition.requiresApprovalPolicyId !== undefined) {
      const [decisions, approvals] = await Promise.all([
        this.repositories.decisions.list(workspaceId),
        this.repositories.approvals.list(workspaceId),
      ]);
      const approvedDecision = decisions.find(
        (decision) =>
          decision.caseId === caseId &&
          decision.approvalPolicyId === transition.requiresApprovalPolicyId &&
          decision.status === "approved" &&
          approvals.some(
            (approval) =>
              approval.decisionId === decision.id && approval.outcome === "approved",
          ),
      );
      if (approvedDecision === undefined) {
        throw new Error(
          `Transition "${transition.id}" requires a recorded human Approval for policy "${transition.requiresApprovalPolicyId}"`,
        );
      }
    }
    const target = workflow.states.find(({ id }) => id === targetState)!;
    if (target.terminal) {
      const unmet = await this.unmetClosureRequirements(workspaceId, caseRecord, workflow);
      if (unmet.length > 0) {
        throw new Error(`Case closure requirements are not satisfied: ${unmet.join(", ")}`);
      }
    }

    const occurredAt = this.clock().toISOString();
    const updated: Case = { ...caseRecord, status: targetState, updatedAt: occurredAt };
    const persisted =
      (await this.repositories.cases.update(workspaceId, caseId, updated)) ?? updated;
    await appendOperationalAudit(this.repositories.auditEntries, {
      workspaceId,
      occurredAt,
      action: "case-transitioned",
      actorId: input.actor.id,
      actorType: input.actor.type,
      subject: { type: "case", id: caseId },
      cause: input.cause,
      data: {
        transitionId: transition.id,
        from: caseRecord.status,
        to: targetState,
      },
    });
    return persisted;
  }

  async unmetClosureRequirements(
    workspaceId: string,
    caseRecord: Case,
    workflow: WorkflowDefinition,
  ): Promise<string[]> {
    const required = workflow.closureRequirements.filter((requirement) =>
      caseRecord.closureRequirementIds.includes(requirement.id),
    );
    const [actions, decisions, observations, events] = await Promise.all([
      this.repositories.actionItems.list(workspaceId),
      this.repositories.decisions.list(workspaceId),
      this.repositories.observations.list(workspaceId),
      this.repositories.operationalEvents.list(workspaceId),
    ]);
    const caseActions = actions.filter(({ caseId }) => caseId === caseRecord.id);
    const caseDecisions = decisions.filter(({ caseId }) => caseId === caseRecord.id);
    const observationIds = new Set(
      events
        .filter(({ id }) => caseRecord.relatedEventIds.includes(id))
        .flatMap(({ observationIds: ids }) => ids),
    );
    const caseObservations = observations.filter(({ id }) => observationIds.has(id));

    return required
      .filter((requirement) => {
        if (requirement.type === "action-completed") {
          return !caseActions.some(
            (action) =>
              action.status === "completed" &&
              (requirement.definitionId === undefined ||
                action.actionType === requirement.definitionId),
          );
        }
        if (requirement.type === "decision-approved") {
          return !caseDecisions.some(
            (decision) =>
              decision.status === "approved" &&
              (requirement.definitionId === undefined ||
                decision.decisionType === requirement.definitionId),
          );
        }
        if (requirement.type === "observation-reviewed") {
          const matching = caseObservations.filter(
            (observation) =>
              requirement.definitionId === undefined ||
              observation.schemaKey === requirement.definitionId,
          );
          return (
            matching.length === 0 ||
            matching.some((observation) =>
              ["pending", "conflicting"].includes(observation.reviewStatus),
            )
          );
        }
        return !caseObservations.some(
          (observation) =>
            observation.evidenceSegmentId !== null &&
            (requirement.definitionId === undefined ||
              observation.schemaKey === requirement.definitionId),
        );
      })
      .map(({ id }) => id);
  }

  private async ensureCase(
    workspaceId: string,
    pack: CaseLifecyclePack,
    definition: CaseDefinition,
    context: CaseRuleContext,
  ): Promise<Case> {
    const existing = await this.findRelatedCase(workspaceId, context.event, definition.caseType);
    if (existing !== null) {
      return this.reconcileRelatedState(workspaceId, existing, context.event);
    }
    const workflow = pack.workflows[definition.workflowId];
    if (workflow === undefined) {
      throw new Error(`Case definition references unknown workflow "${definition.workflowId}"`);
    }
    const parameters = context.parameters ?? {};
    const severity = severityParameter(parameters, definition.defaultSeverity);
    const priority = highestPriority([
      priorityParameter(parameters, definition.defaultPriority),
      priorityForSeverity(severity),
    ]);
    const dueInHours = numericParameter(parameters, "dueInHours") ?? definition.defaultDueInHours;
    const groupingKey = context.event.entityIds.length > 0
      ? unique(context.event.entityIds).join(":")
      : context.event.id;
    const occurredAt = this.clock().toISOString();
    const value: Case = {
      id: deterministicUuid(workspaceId, `case:${definition.caseType}:${groupingKey}`),
      workspaceId,
      caseType: definition.caseType,
      title:
        stringParameter(parameters, "title") ??
        `${definition.displayName.singular}: ${context.event.eventType}`,
      status: workflow.initialState,
      priority,
      severity,
      owner: stringParameter(parameters, "owner") ?? definition.defaultOwner,
      dueAt:
        stringParameter(parameters, "dueAt") ??
        (dueInHours === null
          ? null
          : new Date(this.clock().getTime() + dueInHours * 60 * 60 * 1000).toISOString()),
      relatedEntityIds: unique(context.event.entityIds),
      relatedEventIds: [context.event.id],
      relatedSignalIds: [],
      closureRequirementIds: [...definition.closureRequirements],
      reEvaluationStatus: "current",
      createdAt: occurredAt,
      updatedAt: occurredAt,
    };
    const persisted = await this.repositories.cases.insert(workspaceId, value);
    await appendOperationalAudit(this.repositories.auditEntries, {
      workspaceId,
      occurredAt,
      action: "case-created",
      actorId: "case-engine",
      subject: { type: "case", id: persisted.id },
      cause: context.rule.description,
      data: {
        caseType: persisted.caseType,
        ruleId: context.rule.id,
        ruleVersion: context.rule.version,
        eventId: context.event.id,
      },
    });
    return persisted;
  }
}

export function zeroRuleAggregates(): RuleAggregateValues {
  return { openCaseCount: 0, openActionCount: 0, pendingDecisionCount: 0 };
}
