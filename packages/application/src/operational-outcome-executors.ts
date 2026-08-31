import type {
  ActionItem,
  ArtifactSegment,
  Case,
  CaseDefinition,
  Decision,
} from "@oiw/contracts";

import { ActionItemService } from "./action-items.js";
import {
  CaseLifecycleService,
  type CaseLifecyclePack,
  type CaseLifecycleRepositories,
} from "./case-lifecycle.js";
import { DecisionService } from "./decisions.js";
import type {
  RuleActionExecutionContext,
  RuleActionExecutionResult,
  RuleActionExecutor,
  RuleEvaluatorPort,
} from "./rule-execution.js";

interface OperationalOutcomeRepositories extends CaseLifecycleRepositories {
  artifactSegments: {
    findById(workspaceId: string, id: string): Promise<ArtifactSegment | null>;
  };
  actionItems: CaseLifecycleRepositories["actionItems"] & {
    update(
      workspaceId: string,
      id: string,
      value: ActionItem,
    ): Promise<ActionItem | null>;
  };
  decisions: CaseLifecycleRepositories["decisions"] & {
    update(
      workspaceId: string,
      id: string,
      value: Decision,
    ): Promise<Decision | null>;
  };
}

export class OperationalOutcomeCoordinator {
  readonly cases: CaseLifecycleService;
  readonly actions: ActionItemService;
  readonly decisions: DecisionService;

  constructor(
    private readonly repositories: OperationalOutcomeRepositories,
    ruleEvaluator: RuleEvaluatorPort,
    clock: () => Date = () => new Date(),
  ) {
    this.cases = new CaseLifecycleService(repositories, ruleEvaluator, clock);
    this.actions = new ActionItemService(repositories, clock);
    this.decisions = new DecisionService(repositories, clock);
  }

  async ensureTriggeredCases(
    context: RuleActionExecutionContext,
    pack: CaseLifecyclePack,
  ) {
    return this.cases.ensureCasesForRule(context.workspaceId, pack, {
      event: context.event,
      observations: context.observations,
      rule: context.rule,
    });
  }

  async reconcileCases(
    workspaceId: string,
    event: RuleActionExecutionContext["event"],
    cases: readonly Case[],
  ) {
    return Promise.all(
      cases.map((caseRecord) =>
        this.cases.reconcileRelatedState(workspaceId, caseRecord, event),
      ),
    );
  }

  executors(packResolver: (workspaceId: string) => Promise<CaseLifecyclePack> | CaseLifecyclePack) {
    return [
      new CreateCaseOutcomeExecutor(this, packResolver),
      new CreateActionOutcomeExecutor(this, packResolver),
      new ProposeDecisionOutcomeExecutor(this, packResolver),
    ] as const;
  }
}

async function relatedCase(
  coordinator: OperationalOutcomeCoordinator,
  context: RuleActionExecutionContext,
  pack: CaseLifecyclePack,
  definition?: CaseDefinition,
) {
  const existing = await coordinator.cases.findRelatedCase(
    context.workspaceId,
    context.event,
    definition?.caseType,
  );
  if (existing !== null) return existing;
  const triggered = await coordinator.ensureTriggeredCases(context, pack);
  const selected = definition === undefined
    ? triggered.at(0)
    : triggered.find(({ caseType }) => caseType === definition.caseType);
  if (selected === undefined) {
    throw new Error(
      `Rule action "${context.action.type}" requires a related Case for Event "${context.event.id}"`,
    );
  }
  return selected;
}

class CreateCaseOutcomeExecutor implements RuleActionExecutor {
  readonly type = "create-case" as const;

  constructor(
    private readonly coordinator: OperationalOutcomeCoordinator,
    private readonly packResolver: (
      workspaceId: string,
    ) => Promise<CaseLifecyclePack> | CaseLifecyclePack,
  ) {}

  async execute(context: RuleActionExecutionContext): Promise<RuleActionExecutionResult> {
    const pack = await this.packResolver(context.workspaceId);
    const existing = await this.coordinator.cases.findRelatedCase(
      context.workspaceId,
      context.event,
      context.action.definitionId,
    );
    const caseRecord = await this.coordinator.cases.ensureCaseForAction(
      context.workspaceId,
      pack,
      context.action.definitionId,
      {
        event: context.event,
        observations: context.observations,
        rule: context.rule,
        parameters: context.action.parameters,
      },
    );
    return {
      status: "executed",
      subjectId: caseRecord.id,
      detail: { idempotent: existing !== null },
    };
  }
}

class CreateActionOutcomeExecutor implements RuleActionExecutor {
  readonly type = "create-action" as const;

  constructor(
    private readonly coordinator: OperationalOutcomeCoordinator,
    private readonly packResolver: (
      workspaceId: string,
    ) => Promise<CaseLifecyclePack> | CaseLifecyclePack,
  ) {}

  async execute(context: RuleActionExecutionContext): Promise<RuleActionExecutionResult> {
    const pack = await this.packResolver(context.workspaceId);
    const caseRecord = await relatedCase(this.coordinator, context, pack);
    const result = await this.coordinator.actions.createFromRule(
      context,
      caseRecord.id,
      caseRecord.owner,
      caseRecord.dueAt,
    );
    return {
      status: "executed",
      subjectId: result.actionItem.id,
      detail: { idempotent: result.idempotent, caseId: caseRecord.id },
    };
  }
}

class ProposeDecisionOutcomeExecutor implements RuleActionExecutor {
  readonly type = "propose-decision" as const;

  constructor(
    private readonly coordinator: OperationalOutcomeCoordinator,
    private readonly packResolver: (
      workspaceId: string,
    ) => Promise<CaseLifecyclePack> | CaseLifecyclePack,
  ) {}

  async execute(context: RuleActionExecutionContext): Promise<RuleActionExecutionResult> {
    const pack = await this.packResolver(context.workspaceId);
    const caseRecord = await relatedCase(this.coordinator, context, pack);
    const result = await this.coordinator.decisions.proposeFromRule(context, caseRecord.id);
    return {
      status: "executed",
      subjectId: result.decision.id,
      detail: { idempotent: result.idempotent, caseId: caseRecord.id },
    };
  }
}
