import type { Approval, Case, Decision } from "@oiw/contracts";

import {
  appendOperationalAudit,
  type OperationalAuditRepository,
} from "./operational-audit.js";
import { deterministicUuid } from "./records.js";
import type { RuleActionExecutionContext } from "./rule-execution.js";

interface DecisionRepositories {
  decisions: {
    insert(workspaceId: string, value: Decision): Promise<Decision>;
    findById(workspaceId: string, id: string): Promise<Decision | null>;
    update(workspaceId: string, id: string, value: Decision): Promise<Decision | null>;
  };
  approvals: {
    insert(workspaceId: string, value: Approval): Promise<Approval>;
    list(workspaceId: string): Promise<Approval[]>;
  };
  cases: {
    findById(workspaceId: string, id: string): Promise<Case | null>;
    update(workspaceId: string, id: string, value: Case): Promise<Case | null>;
  };
  auditEntries: OperationalAuditRepository;
}

const risks = new Set<Decision["riskLevel"]>(["low", "medium", "high", "critical"]);
const approvalAuditActions: Record<Approval["outcome"], string> = {
  approved: "decision-approved",
  rejected: "decision-rejected",
  "more-information-required": "decision-more-information-requested",
};

export interface HumanSessionIdentity {
  type: "human";
  id: string;
}

export class DecisionService {
  constructor(
    private readonly repositories: DecisionRepositories,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async proposeFromRule(
    context: RuleActionExecutionContext,
    caseId: string,
  ): Promise<{ decision: Decision; idempotent: boolean }> {
    const id = deterministicUuid(
      context.workspaceId,
      `decision:${caseId}:${context.action.definitionId}:${String(context.action.parameters["approvalPolicyId"] ?? "")}`,
    );
    const existing = await this.repositories.decisions.findById(context.workspaceId, id);
    if (existing !== null) return { decision: existing, idempotent: true };
    const parameters = context.action.parameters;
    const risk = parameters["riskLevel"];
    if (typeof risk !== "string" || !risks.has(risk as Decision["riskLevel"])) {
      throw new Error(`Decision action "${context.action.definitionId}" has an invalid riskLevel`);
    }
    const approvalPolicyId = parameters["approvalPolicyId"];
    if (typeof approvalPolicyId !== "string" || approvalPolicyId.length === 0) {
      throw new Error(
        `Decision action "${context.action.definitionId}" has no approvalPolicyId`,
      );
    }
    const evidenceSegmentIds = [
      ...new Set(
        context.observations
          .map(({ evidenceSegmentId }) => evidenceSegmentId)
          .filter((value): value is string => value !== null),
      ),
    ];
    if (evidenceSegmentIds.length === 0) {
      throw new Error(`Decision action "${context.action.definitionId}" has no source evidence`);
    }
    const createdAt = this.clock().toISOString();
    const proposed = await this.repositories.decisions.insert(context.workspaceId, {
      id,
      workspaceId: context.workspaceId,
      caseId,
      decisionType:
        typeof parameters["decisionType"] === "string"
          ? parameters["decisionType"]
          : context.action.definitionId,
      proposal:
        typeof parameters["proposal"] === "string"
          ? parameters["proposal"]
          : context.action.definitionId,
      rationale:
        typeof parameters["rationale"] === "string"
          ? parameters["rationale"]
          : context.trace.rationale,
      evidenceSegmentIds,
      riskLevel: risk as Decision["riskLevel"],
      approvalPolicyId,
      status: "proposed",
      createdAt,
      decidedAt: null,
    });
    await appendOperationalAudit(this.repositories.auditEntries, {
      workspaceId: context.workspaceId,
      occurredAt: createdAt,
      action: "decision-proposed",
      actorId: "decision-engine",
      subject: { type: "decision", id: proposed.id },
      cause: context.rule.description,
      data: {
        caseId,
        ruleId: context.rule.id,
        ruleVersion: context.rule.version,
        riskLevel: proposed.riskLevel,
        approvalPolicyId,
        evidenceQuality:
          typeof parameters["evidenceQuality"] === "string"
            ? parameters["evidenceQuality"]
            : null,
      },
    });
    return {
      decision: await this.moveToAwaitingApproval(context.workspaceId, proposed.id),
      idempotent: false,
    };
  }

  async moveToAwaitingApproval(workspaceId: string, decisionId: string): Promise<Decision> {
    const current = await this.requireDecision(workspaceId, decisionId);
    if (current.status === "awaiting-approval") return current;
    if (current.status !== "proposed") {
      throw new Error(`Decision cannot await approval from status "${current.status}"`);
    }
    const value: Decision = { ...current, status: "awaiting-approval" };
    const persisted =
      (await this.repositories.decisions.update(workspaceId, decisionId, value)) ?? value;
    await appendOperationalAudit(this.repositories.auditEntries, {
      workspaceId,
      occurredAt: this.clock().toISOString(),
      action: "decision-awaiting-approval",
      actorId: "decision-engine",
      subject: { type: "decision", id: decisionId },
      cause: `Approval policy ${current.approvalPolicyId} must be satisfied`,
      data: { caseId: current.caseId, approvalPolicyId: current.approvalPolicyId },
    });
    return persisted;
  }

  async attemptStatusBypass(
    workspaceId: string,
    decisionId: string,
    status: Decision["status"],
  ): Promise<Decision> {
    if (status === "approved") {
      throw new Error("A Decision can be approved only through a recorded human Approval");
    }
    throw new Error(`Direct Decision status changes are prohibited; requested "${status}"`);
  }

  private async requireDecision(workspaceId: string, decisionId: string): Promise<Decision> {
    const decision = await this.repositories.decisions.findById(workspaceId, decisionId);
    if (decision === null) throw new Error(`Decision "${decisionId}" was not found`);
    return decision;
  }
}

export class ApprovalService {
  constructor(
    private readonly repositories: DecisionRepositories,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async apply(
    workspaceId: string,
    decisionId: string,
    input: {
      identity: HumanSessionIdentity;
      outcome: Approval["outcome"];
      comment: string | null;
    },
  ): Promise<{ approval: Approval; decision: Decision; caseRecord: Case }> {
    if (input.identity.type !== "human" || input.identity.id.trim().length === 0) {
      throw new Error("Approval requires an authenticated human session identity");
    }
    const current = await this.repositories.decisions.findById(workspaceId, decisionId);
    if (current === null) throw new Error(`Decision "${decisionId}" was not found`);
    if (current.status !== "awaiting-approval") {
      throw new Error(`Decision is not awaiting approval; current status is "${current.status}"`);
    }
    const approvedAt = this.clock().toISOString();
    const approval = await this.repositories.approvals.insert(workspaceId, {
      id: deterministicUuid(
        workspaceId,
        `approval:${decisionId}:${input.identity.id}:${input.outcome}`,
      ),
      workspaceId,
      decisionId,
      approver: input.identity.id,
      outcome: input.outcome,
      comment: input.comment,
      approvedAt,
    });
    const approvedDecision: Decision = {
      ...current,
      status: approval.outcome,
      decidedAt: approval.approvedAt,
    };
    const decision =
      (await this.repositories.decisions.update(workspaceId, decisionId, approvedDecision)) ??
      approvedDecision;
    const caseRecord = await this.repositories.cases.findById(workspaceId, decision.caseId);
    if (caseRecord === null) throw new Error(`Case "${decision.caseId}" was not found`);
    const updatedCase: Case = { ...caseRecord, updatedAt: approvedAt };
    const persistedCase =
      (await this.repositories.cases.update(workspaceId, caseRecord.id, updatedCase)) ??
      updatedCase;
    await appendOperationalAudit(this.repositories.auditEntries, {
      workspaceId,
      occurredAt: approvedAt,
      action: approvalAuditActions[input.outcome],
      actorId: input.identity.id,
      actorType: "human",
      subject: { type: "decision", id: decisionId },
      cause: input.comment ?? `Human decision outcome recorded as ${input.outcome}`,
      data: {
        approvalId: approval.id,
        caseId: decision.caseId,
        outcome: input.outcome,
        previousDecisionStatus: current.status,
      },
    });
    await appendOperationalAudit(this.repositories.auditEntries, {
      workspaceId,
      occurredAt: approvedAt,
      action: "case-decision-outcome-recorded",
      actorId: input.identity.id,
      actorType: "human",
      subject: { type: "case", id: persistedCase.id },
      cause: `Decision ${decisionId} was ${input.outcome}`,
      data: { decisionId, approvalId: approval.id, outcome: input.outcome },
    });
    return { approval, decision, caseRecord: persistedCase };
  }
}
