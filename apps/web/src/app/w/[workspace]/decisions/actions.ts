"use server";

import type { Approval, Decision } from "@oiw/contracts";
import { ApprovalService } from "@oiw/application";

import { toActionFailure, type ActionFailure, UserFacingActionError } from "@/lib/server/action-error";
import { getRepositories } from "@/lib/server/db";
import { enforceGuestRateLimit } from "@/lib/server/rate-limit";
import { readSessionPayload } from "@/lib/server/session";
import { requireWorkspace } from "@/lib/server/workspace";

export type DecisionActionResult = { ok: true; decision: Decision } | ActionFailure;

const HIGH_RISK: ReadonlySet<Decision["riskLevel"]> = new Set(["high", "critical"]);
const OUTCOMES: ReadonlySet<string> = new Set(["approved", "rejected", "more-information-required"]);

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
    await enforceGuestRateLimit("decision", workspace);
    const approverId = await currentApproverId();
    const repositories = getRepositories();

    if (!OUTCOMES.has(outcome)) {
      return { ok: false, message: "The decision request is invalid." };
    }

    const current = await repositories.decisions.findById(workspace.id, decisionId);
    if (current === null) return { ok: false, message: "This decision could not be found." };
    const trimmedComment = comment.trim();
    if (HIGH_RISK.has(current.riskLevel) && trimmedComment.length === 0) {
      return { ok: false, message: "A comment is required to decide on a high-risk decision." };
    }

    const result = await new ApprovalService(repositories).apply(workspace.id, decisionId, {
      identity: { type: "human", id: approverId },
      outcome,
      comment: trimmedComment.length > 0 ? trimmedComment : null,
    });
    return { ok: true, decision: result.decision };
  } catch (error) {
    return toActionFailure(error, "Could not save this decision.");
  }
}
