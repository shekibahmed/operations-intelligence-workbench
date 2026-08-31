import type {
  ActionItem,
  Artifact,
  Case,
  Decision,
  JsonValue,
  Observation,
  OperationalEvent,
  RuleDefinition,
  Signal,
} from "@oiw/contracts";

import { deterministicUuid } from "./records.js";
import {
  appendOperationalAuditOnce,
  type OperationalAuditRepository,
} from "./operational-audit.js";

export type RuleAction = RuleDefinition["then"][number];

export interface RuleAggregateValues {
  openCaseCount: number;
  openActionCount: number;
  pendingDecisionCount: number;
}

export interface RuleEvaluatorContext {
  event: OperationalEvent;
  observations: readonly Observation[];
  events: readonly OperationalEvent[];
  aggregates: RuleAggregateValues;
}

export interface RuleEvaluationTracePort {
  ruleId: string;
  ruleVersion: string;
  eventId: string;
  result: boolean;
  condition: unknown;
  firedActions: RuleAction[];
  rationale: string;
  referencedEventIds: string[];
}

export interface RuleEvaluatorPort {
  evaluate(rule: RuleDefinition, context: RuleEvaluatorContext): RuleEvaluationTracePort;
}

export interface RuleActionExecutionContext {
  workspaceId: string;
  event: OperationalEvent;
  observations: readonly Observation[];
  rule: RuleDefinition;
  trace: RuleEvaluationTracePort;
  action: RuleAction;
  actionIndex: number;
}

export interface RuleActionExecutionResult {
  status: "executed" | "pending";
  subjectId: string | null;
  detail: Record<string, JsonValue>;
}

export interface RuleActionExecutor {
  readonly type: RuleAction["type"];
  execute(context: RuleActionExecutionContext): Promise<RuleActionExecutionResult>;
}

export class RuleActionExecutorRegistry {
  private readonly executors = new Map<RuleAction["type"], RuleActionExecutor>();

  constructor(
    defaults: readonly RuleActionExecutor[],
    overrides: readonly RuleActionExecutor[] = [],
  ) {
    for (const executor of defaults) this.executors.set(executor.type, executor);
    for (const executor of overrides) this.executors.set(executor.type, executor);
  }

  async execute(context: RuleActionExecutionContext): Promise<RuleActionExecutionResult> {
    const executor = this.executors.get(context.action.type);
    if (executor === undefined) {
      throw new Error(`No executor is registered for rule action "${context.action.type}"`);
    }
    return executor.execute(context);
  }
}

interface SignalExecutorRepositories {
  signals: {
    insert(workspaceId: string, value: Signal): Promise<Signal>;
    findById(workspaceId: string, signalId: string): Promise<Signal | null>;
  };
  auditEntries: OperationalAuditRepository;
}

const severities = new Set<Signal["severity"]>([
  "info",
  "low",
  "medium",
  "high",
  "critical",
]);

export class CreateSignalActionExecutor implements RuleActionExecutor {
  readonly type = "create-signal" as const;

  constructor(
    private readonly repositories: SignalExecutorRepositories,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(context: RuleActionExecutionContext): Promise<RuleActionExecutionResult> {
    const severity = context.action.parameters["severity"];
    if (typeof severity !== "string" || !severities.has(severity as Signal["severity"])) {
      throw new Error(`Signal action "${context.action.definitionId}" has an invalid severity`);
    }
    const signalId = deterministicUuid(
      context.workspaceId,
      `signal:${context.event.id}:${context.rule.id}:${context.rule.version}:${context.actionIndex}`,
    );
    const existing = await this.repositories.signals.findById(context.workspaceId, signalId);
    if (existing !== null) {
      return { status: "executed", subjectId: existing.id, detail: { idempotent: true } };
    }
    const evidenceSegmentIds = [
      ...new Set(
        context.observations
          .map(({ evidenceSegmentId }) => evidenceSegmentId)
          .filter((value): value is string => value !== null),
      ),
    ];
    if (evidenceSegmentIds.length === 0) {
      throw new Error(`Signal action "${context.action.definitionId}" has no source evidence`);
    }
    const signal = await this.repositories.signals.insert(context.workspaceId, {
      id: signalId,
      workspaceId: context.workspaceId,
      signalType: context.action.definitionId,
      severity: severity as Signal["severity"],
      eventIds: [...new Set(context.trace.referencedEventIds)],
      evidenceSegmentIds,
      rule: { id: context.rule.id, version: context.rule.version },
      rationale: context.rule.description,
      createdAt: this.clock().toISOString(),
    });
    await appendOperationalAuditOnce(this.repositories.auditEntries, {
      workspaceId: context.workspaceId,
      occurredAt: this.clock().toISOString(),
      action: "signal-created",
      actorId: "rule-action-executor",
      subject: { type: "signal", id: signal.id },
      cause: context.rule.description,
      data: {
        ruleId: context.rule.id,
        ruleVersion: context.rule.version,
        eventIds: signal.eventIds,
        signalType: signal.signalType,
        severity: signal.severity,
      },
      idempotencyKey: `signal-created:${signal.id}`,
    });
    return { status: "executed", subjectId: signal.id, detail: { idempotent: false } };
  }
}

interface ReviewExecutorRepositories {
  artifacts: {
    updateProcessingStatus(
      workspaceId: string,
      artifactId: string,
      status: Artifact["processingStatus"],
    ): Promise<Artifact | null>;
  };
  auditEntries: OperationalAuditRepository;
}

export class FlagReviewActionExecutor implements RuleActionExecutor {
  readonly type = "flag-review" as const;

  constructor(
    private readonly repositories: ReviewExecutorRepositories,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(context: RuleActionExecutionContext): Promise<RuleActionExecutionResult> {
    const artifactIds = [...new Set(context.observations.map(({ artifactId }) => artifactId))];
    for (const artifactId of artifactIds) {
      await this.repositories.artifacts.updateProcessingStatus(
        context.workspaceId,
        artifactId,
        "needs-review",
      );
    }
    const appended = await appendOperationalAuditOnce(this.repositories.auditEntries, {
      workspaceId: context.workspaceId,
      occurredAt: this.clock().toISOString(),
      action: "rule-review-flagged",
      actorId: "rule-action-executor",
      subject: { type: "operational-event", id: context.event.id },
      cause:
        typeof context.action.parameters["reason"] === "string"
          ? context.action.parameters["reason"]
          : context.rule.description,
      data: {
        ruleId: context.rule.id,
        ruleVersion: context.rule.version,
        definitionId: context.action.definitionId,
        artifactIds,
      },
      idempotencyKey: `review:${context.event.id}:${context.rule.id}:${context.actionIndex}`,
    });
    return {
      status: "executed",
      subjectId: context.event.id,
      detail: { artifactIds, idempotent: appended === null },
    };
  }
}

export class PendingRuleOutcomeExecutor implements RuleActionExecutor {
  constructor(
    readonly type: "create-case" | "create-action" | "propose-decision",
    private readonly auditEntries: OperationalAuditRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(context: RuleActionExecutionContext): Promise<RuleActionExecutionResult> {
    const outcomeKey = `${context.event.id}:${context.rule.id}:${context.rule.version}:${context.actionIndex}`;
    const appended = await appendOperationalAuditOnce(this.auditEntries, {
      workspaceId: context.workspaceId,
      occurredAt: this.clock().toISOString(),
      action: "rule-action-pending",
      actorId: "rule-action-executor",
      subject: { type: "operational-event", id: context.event.id },
      cause: "The rule fired an outcome assigned to the batch-C operational engines",
      data: {
        outcomeKey,
        actionType: context.action.type,
        definitionId: context.action.definitionId,
        parameters: context.action.parameters,
        ruleId: context.rule.id,
        ruleVersion: context.rule.version,
        eventId: context.event.id,
      },
      idempotencyKey: `pending:${outcomeKey}`,
    });
    return {
      status: "pending",
      subjectId: null,
      detail: { outcomeKey, actionType: context.action.type, idempotent: appended === null },
    };
  }
}

export interface OperationalCountRecords {
  cases: readonly Case[];
  actionItems: readonly ActionItem[];
  decisions: readonly Decision[];
}
