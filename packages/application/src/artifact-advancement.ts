import { createHash } from "node:crypto";

import type {
  ActionItem,
  Artifact,
  AuditEntry,
  Case,
  Decision,
  Entity,
  EventDefinition,
  Observation,
  ObservationSchemaDefinition,
  OperationalEvent,
  RuleDefinition,
  Signal,
  WorkflowDefinition,
} from "@oiw/contracts";

import { EntityResolutionService, type EntityResolutionResult } from "./entity-resolution.js";
import { EventAssemblyService, type EventAssemblyResult } from "./event-assembly.js";
import {
  appendOperationalAuditOnce,
  toJsonValue,
  type OperationalAuditRepository,
} from "./operational-audit.js";
import { stableJson } from "./records.js";
import {
  CreateSignalActionExecutor,
  FlagReviewActionExecutor,
  PendingRuleOutcomeExecutor,
  RuleActionExecutorRegistry,
  type RuleActionExecutionResult,
  type RuleActionExecutor,
  type RuleAggregateValues,
  type RuleEvaluationTracePort,
  type RuleEvaluatorPort,
} from "./rule-execution.js";

interface ScopedRepository<T> {
  insert(workspaceId: string, value: T): Promise<T>;
  findById(workspaceId: string, id: string): Promise<T | null>;
  list(workspaceId: string): Promise<T[]>;
}

export interface ArtifactAdvancementRepositories {
  artifacts: ScopedRepository<Artifact> & {
    updateProcessingStatus(
      workspaceId: string,
      artifactId: string,
      status: Artifact["processingStatus"],
    ): Promise<Artifact | null>;
  };
  entities: ScopedRepository<Entity>;
  observations: ScopedRepository<Observation> & {
    listByArtifact(workspaceId: string, artifactId: string): Promise<Observation[]>;
    correct(
      workspaceId: string,
      observationId: string,
      value: Observation,
      auditEntry: AuditEntry,
    ): Promise<Observation | null>;
  };
  operationalEvents: ScopedRepository<OperationalEvent>;
  signals: ScopedRepository<Signal>;
  cases: ScopedRepository<Case>;
  actionItems: ScopedRepository<ActionItem>;
  decisions: ScopedRepository<Decision>;
  auditEntries: ScopedRepository<AuditEntry> & OperationalAuditRepository;
}

export interface ArtifactAdvancementPack {
  manifest: { id: string; version: string };
  observationSchemas: ReadonlyMap<string, ObservationSchemaDefinition>;
  eventDefinitions: ReadonlyMap<string, EventDefinition>;
  workflows: Record<string, WorkflowDefinition>;
  rules: readonly RuleDefinition[];
}

export interface ArtifactAdvancementPackResolver {
  resolve(workspaceId: string): Promise<ArtifactAdvancementPack> | ArtifactAdvancementPack;
}

export interface ArtifactAdvancementResult {
  artifact: Artifact;
  entityResolution: EntityResolutionResult;
  eventAssembly: EventAssemblyResult;
  ruleTraces: RuleEvaluationTracePort[];
  actionResults: RuleActionExecutionResult[];
  idempotent: boolean;
}

function intersects(left: readonly string[], right: readonly string[]): boolean {
  const values = new Set(left);
  return right.some((value) => values.has(value));
}

function relatedCase(caseRecord: Case, event: OperationalEvent): boolean {
  return (
    caseRecord.relatedEventIds.includes(event.id) ||
    intersects(caseRecord.relatedEntityIds, event.entityIds)
  );
}

function aggregateValues(
  pack: ArtifactAdvancementPack,
  event: OperationalEvent,
  cases: readonly Case[],
  actionItems: readonly ActionItem[],
  decisions: readonly Decision[],
): RuleAggregateValues {
  const terminalStates = new Set(
    Object.values(pack.workflows).flatMap((workflow) =>
      workflow.states.filter(({ terminal }) => terminal).map(({ id }) => id),
    ),
  );
  const relatedCases = cases.filter((caseRecord) => relatedCase(caseRecord, event));
  const relatedCaseIds = new Set(relatedCases.map(({ id }) => id));
  return {
    openCaseCount: relatedCases.filter(({ status }) => !terminalStates.has(status)).length,
    openActionCount: actionItems.filter(
      ({ caseId, status }) =>
        relatedCaseIds.has(caseId) && status !== "completed" && status !== "cancelled",
    ).length,
    pendingDecisionCount: decisions.filter(
      ({ caseId, status }) =>
        relatedCaseIds.has(caseId) &&
        (status === "proposed" || status === "awaiting-approval"),
    ).length,
  };
}

function evaluationKey(trace: RuleEvaluationTracePort): string {
  return createHash("sha256")
    .update(stableJson(toJsonValue(trace)))
    .digest("hex");
}

export class ArtifactAdvancementService {
  private readonly entityResolution: EntityResolutionService;
  private readonly eventAssembly: EventAssemblyService;
  private readonly actionExecutors: RuleActionExecutorRegistry;

  constructor(
    private readonly repositories: ArtifactAdvancementRepositories,
    private readonly packResolver: ArtifactAdvancementPackResolver,
    private readonly ruleEvaluator: RuleEvaluatorPort,
    executorOverrides: readonly RuleActionExecutor[] = [],
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.entityResolution = new EntityResolutionService(repositories, clock);
    this.eventAssembly = new EventAssemblyService(repositories, clock);
    this.actionExecutors = new RuleActionExecutorRegistry(
      [
        new CreateSignalActionExecutor(repositories, clock),
        new FlagReviewActionExecutor(repositories, clock),
        new PendingRuleOutcomeExecutor("create-case", repositories.auditEntries, clock),
        new PendingRuleOutcomeExecutor("create-action", repositories.auditEntries, clock),
        new PendingRuleOutcomeExecutor("propose-decision", repositories.auditEntries, clock),
      ],
      executorOverrides,
    );
  }

  async advanceArtifact(
    workspaceId: string,
    artifactId: string,
  ): Promise<ArtifactAdvancementResult> {
    const artifact = await this.repositories.artifacts.findById(workspaceId, artifactId);
    if (artifact === null) {
      throw new Error(`Artifact "${artifactId}" was not found in workspace "${workspaceId}"`);
    }
    if (artifact.processingStatus !== "processed" && artifact.processingStatus !== "needs-review") {
      throw new Error(`Artifact "${artifactId}" must be processed before operational advancement`);
    }
    const pack = await this.packResolver.resolve(workspaceId);
    const initialObservations = await this.repositories.observations.listByArtifact(
      workspaceId,
      artifactId,
    );
    const entityResolution = await this.entityResolution.resolve(
      workspaceId,
      initialObservations,
      pack.observationSchemas,
    );
    const eventAssembly = await this.eventAssembly.assemble(
      workspaceId,
      artifact,
      entityResolution.observations,
      pack.eventDefinitions,
    );
    if (eventAssembly.event === null) {
      return {
        artifact,
        entityResolution,
        eventAssembly,
        ruleTraces: [],
        actionResults: [],
        idempotent: eventAssembly.idempotent,
      };
    }

    const [events, cases, actionItems, decisions] = await Promise.all([
      this.repositories.operationalEvents.list(workspaceId),
      this.repositories.cases.list(workspaceId),
      this.repositories.actionItems.list(workspaceId),
      this.repositories.decisions.list(workspaceId),
    ]);
    const aggregates = aggregateValues(
      pack,
      eventAssembly.event,
      cases,
      actionItems,
      decisions,
    );
    const ruleTraces: RuleEvaluationTracePort[] = [];
    const actionResults: RuleActionExecutionResult[] = [];
    for (const rule of pack.rules) {
      const trace = this.ruleEvaluator.evaluate(rule, {
        event: eventAssembly.event,
        observations: entityResolution.observations,
        events,
        aggregates,
      });
      ruleTraces.push(trace);
      await appendOperationalAuditOnce(this.repositories.auditEntries, {
        workspaceId,
        occurredAt: this.clock().toISOString(),
        action: "rule-evaluated",
        actorId: "rule-engine",
        subject: { type: "operational-event", id: eventAssembly.event.id },
        cause: rule.description,
        data: {
          evaluationKey: evaluationKey(trace),
          ruleId: rule.id,
          ruleVersion: rule.version,
          result: trace.result,
          condition: toJsonValue(trace.condition),
          firedActions: toJsonValue(trace.firedActions),
          rationale: trace.rationale,
          referencedEventIds: trace.referencedEventIds,
        },
        idempotencyKey: `rule:${evaluationKey(trace)}`,
      });
      for (const [actionIndex, action] of trace.firedActions.entries()) {
        actionResults.push(
          await this.actionExecutors.execute({
            workspaceId,
            event: eventAssembly.event,
            observations: entityResolution.observations,
            rule,
            trace,
            action,
            actionIndex,
          }),
        );
      }
    }

    await appendOperationalAuditOnce(this.repositories.auditEntries, {
      workspaceId,
      occurredAt: this.clock().toISOString(),
      action: "artifact-operationally-advanced",
      actorId: "artifact-advancement",
      subject: { type: "artifact", id: artifact.id },
      cause: "Entity resolution, Event assembly and deterministic rules completed synchronously",
      data: {
        eventId: eventAssembly.event.id,
        ruleCount: ruleTraces.length,
        firedActionCount: actionResults.length,
      },
      idempotencyKey: `advanced:${artifact.id}:${eventAssembly.event.id}:${ruleTraces.map(evaluationKey).join(":")}`,
    });
    return {
      artifact,
      entityResolution,
      eventAssembly,
      ruleTraces,
      actionResults,
      idempotent:
        eventAssembly.idempotent && actionResults.every(({ detail }) => detail["idempotent"] === true),
    };
  }
}
