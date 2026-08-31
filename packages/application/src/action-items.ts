import type { ActionItem, ArtifactSegment } from "@oiw/contracts";

import {
  appendOperationalAudit,
  type OperationalAuditRepository,
} from "./operational-audit.js";
import { deterministicUuid } from "./records.js";
import type { RuleActionExecutionContext } from "./rule-execution.js";

interface ActionItemRepositories {
  actionItems: {
    insert(workspaceId: string, value: ActionItem): Promise<ActionItem>;
    findById(workspaceId: string, id: string): Promise<ActionItem | null>;
    update(workspaceId: string, id: string, value: ActionItem): Promise<ActionItem | null>;
  };
  artifactSegments: {
    findById(workspaceId: string, id: string): Promise<ArtifactSegment | null>;
  };
  auditEntries: OperationalAuditRepository;
}

function dueAt(parameters: Record<string, unknown>, fallback: string | null, now: Date): string | null {
  if (typeof parameters["dueAt"] === "string" && !Number.isNaN(Date.parse(parameters["dueAt"]))) {
    return new Date(parameters["dueAt"]).toISOString();
  }
  if (typeof parameters["dueInHours"] === "number" && parameters["dueInHours"] > 0) {
    return new Date(now.getTime() + parameters["dueInHours"] * 60 * 60 * 1000).toISOString();
  }
  return fallback;
}

export class ActionItemService {
  constructor(
    private readonly repositories: ActionItemRepositories,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async createFromRule(
    context: RuleActionExecutionContext,
    caseId: string,
    caseOwner: string | null,
    caseDueAt: string | null,
  ): Promise<{ actionItem: ActionItem; idempotent: boolean }> {
    const id = deterministicUuid(
      context.workspaceId,
      `action:${caseId}:${context.action.definitionId}`,
    );
    const existing = await this.repositories.actionItems.findById(context.workspaceId, id);
    if (existing !== null) return { actionItem: existing, idempotent: true };
    const now = this.clock();
    const parameters = context.action.parameters;
    const actionItem = await this.repositories.actionItems.insert(context.workspaceId, {
      id,
      workspaceId: context.workspaceId,
      caseId,
      actionType: context.action.definitionId,
      title:
        typeof parameters["title"] === "string"
          ? parameters["title"]
          : context.action.definitionId,
      assignee:
        typeof parameters["assignee"] === "string" ? parameters["assignee"] : caseOwner,
      status: "open",
      dueAt: dueAt(parameters, caseDueAt, now),
      completionEvidenceSegmentIds: [],
      completedAt: null,
      createdAt: now.toISOString(),
    });
    await appendOperationalAudit(this.repositories.auditEntries, {
      workspaceId: context.workspaceId,
      occurredAt: now.toISOString(),
      action: "action-item-created",
      actorId: "action-item-engine",
      subject: { type: "action-item", id: actionItem.id },
      cause: context.rule.description,
      data: {
        caseId,
        actionType: actionItem.actionType,
        ruleId: context.rule.id,
        eventId: context.event.id,
      },
    });
    return { actionItem, idempotent: false };
  }

  async complete(
    workspaceId: string,
    actionItemId: string,
    input: {
      identity: { type: "human" | "system"; id: string };
      evidenceSegmentIds?: readonly string[];
      comment?: string;
    },
  ): Promise<ActionItem> {
    const current = await this.repositories.actionItems.findById(workspaceId, actionItemId);
    if (current === null) throw new Error(`Action Item "${actionItemId}" was not found`);
    if (current.status === "completed") return current;
    if (current.status === "cancelled") throw new Error("A cancelled Action Item cannot complete");
    const evidenceSegmentIds = [...new Set(input.evidenceSegmentIds ?? [])];
    for (const evidenceSegmentId of evidenceSegmentIds) {
      if (
        (await this.repositories.artifactSegments.findById(workspaceId, evidenceSegmentId)) === null
      ) {
        throw new Error(`Evidence Segment "${evidenceSegmentId}" was not found`);
      }
    }
    const completedAt = this.clock().toISOString();
    const value: ActionItem = {
      ...current,
      status: "completed",
      completionEvidenceSegmentIds: evidenceSegmentIds,
      completedAt,
    };
    const persisted =
      (await this.repositories.actionItems.update(workspaceId, actionItemId, value)) ?? value;
    await appendOperationalAudit(this.repositories.auditEntries, {
      workspaceId,
      occurredAt: completedAt,
      action: "action-item-completed",
      actorId: input.identity.id,
      actorType: input.identity.type,
      subject: { type: "action-item", id: actionItemId },
      cause: input.comment ?? "The assigned work was recorded as complete",
      data: { caseId: current.caseId, evidenceSegmentIds },
    });
    return persisted;
  }
}
