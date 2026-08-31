"use server";

import { randomUUID } from "node:crypto";

import type { Approval, Decision } from "@oiw/contracts";

import { toActionErrorMessage, UserFacingActionError } from "@/lib/server/action-error";
import { buildAuditEntry } from "@/lib/server/audit";
import { getRepositories } from "@/lib/server/db";
import { readSessionPayload } from "@/lib/server/session";
import { requireWorkspace } from "@/lib/server/workspace";

export type DecisionActionResult = { ok: true; decision: Decision } | { ok: false; message: string };

const OUTCOME_STATUS: Record<Approval["outcome"], Decision["status"]> = {
  approved: "approved",
  rejected: "rejected",
  "more-information-required": "more-information-required",
};

const OUTCOME_AUDIT_ACTION: Record<Approval["outcome"], string> = {
  approved: "decision-approved",
  rejected: "decision-rejected",
  "more-information-required": "decision-more-information-requested",
};

const HIGH_RISK: ReadonlySet<Decision["riskLevel"]> = new Set(["high", "critical"]);
const PENDING_STATUSES: ReadonlySet<Decision["status"]> = new Set(["proposed", "awaiting-approval"]);

async function currentApproverId(): Promise<string> {
  const payload = await readSessionPayload();
  if (payload === null) {
    throw new UserFacingActionError("Your session has expired — reload the page and start a new guided demo.");
  }
  return payload.sessionId;
}

/**
 * Decision Centre's Approve/Reject/Request-more-information (UX_SPEC §5.11,
 * PRD §9.13/§22.4): records a human Approval before the Decision transitions
 * — the persistence layer's own invariant additionally refuses an `approved`
 * Decision without a matching Approval already present, so this order
 * (insert Approval, then update Decision) is required, not incidental.
 * High-risk/critical Decisions require a non-empty comment server-side too,
 * not only via the client confirmation dialogue.
 */
export async function decideOnDecision(
  slug: string,
  decisionId: string,
  outcome: Approval["outcome"],
  comment: string,
): Promise<DecisionActionResult> {
  try {
    const workspace = await requireWorkspace(slug);
    const approverId = await currentApproverId();
    const repositories = getRepositories();

    const current = await repositories.decisions.findById(workspace.id, decisionId);
    if (current === null) return { ok: false, message: "This decision could not be found." };
    if (!PENDING_STATUSES.has(current.status)) {
      return { ok: false, message: `This decision was already ${current.status.replace(/-/g, " ")}.` };
    }
    const trimmedComment = comment.trim();
    if (HIGH_RISK.has(current.riskLevel) && trimmedComment.length === 0) {
      return { ok: false, message: "A comment is required to decide on a high-risk decision." };
    }

    const occurredAt = new Date().toISOString();
    const approval = await repositories.approvals.insert(workspace.id, {
      id: randomUUID(),
      workspaceId: workspace.id,
      decisionId,
      approver: approverId,
      outcome,
      comment: trimmedComment.length > 0 ? trimmedComment : null,
      approvedAt: occurredAt,
    });

    const updatedDecision: Decision = { ...current, status: OUTCOME_STATUS[outcome], decidedAt: occurredAt };
    const result = await repositories.decisions.update(workspace.id, decisionId, updatedDecision);
    if (result === null) return { ok: false, message: "This decision could not be found." };

    const auditEntry = await buildAuditEntry(repositories, {
      workspaceId: workspace.id,
      occurredAt,
      action: OUTCOME_AUDIT_ACTION[outcome],
      actor: { type: "human", id: approverId },
      subject: { type: "decision", id: decisionId },
      cause: trimmedComment.length > 0 ? trimmedComment : `Approver recorded outcome "${outcome}"`,
      data: { previousStatus: current.status, status: result.status, approvalId: approval.id, riskLevel: current.riskLevel },
    });
    await repositories.auditEntries.insert(workspace.id, auditEntry);

    return { ok: true, decision: result };
  } catch (error) {
    return { ok: false, message: toActionErrorMessage(error, "Could not save this decision.") };
  }
}
