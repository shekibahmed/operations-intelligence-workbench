"use client";

import { useState } from "react";
import type { Decision } from "@oiw/contracts";

import { decideOnDecision } from "@/app/w/[workspace]/decisions/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface DecisionCardData {
  decision: Decision;
  proposalLabel: string;
  triggeringRule: { label: string; href: string } | null;
  requiredApprover: string;
  potentialConsequence: string;
  evidenceLinks: { label: string; href: string }[];
}

const RISK_TONE = { low: "neutral", medium: "warn", high: "warn", critical: "critical" } as const;
const STATUS_LABEL: Record<Decision["status"], string> = {
  proposed: "Proposed",
  "awaiting-approval": "Awaiting approval",
  approved: "Approved",
  rejected: "Rejected",
  "more-information-required": "More information required",
};

/**
 * PRD §22.4: a comment is required before Approve/Reject is enabled for a
 * high-risk (or critical) decision, via a focus-managed confirmation dialog
 * rather than `window.confirm()` (UX_SPEC §5.11). Approve/Reject/Request
 * more information write a real, session-validated, audited Approval and
 * Decision status change (`@/app/w/[workspace]/decisions/actions`); a failed
 * action shows its error on this card only and leaves the Decision pending.
 */
export function DecisionCard({ workspace, data }: { workspace: string; data: DecisionCardData }) {
  const { decision, proposalLabel, triggeringRule, requiredApprover, potentialConsequence, evidenceLinks } = data;
  const [current, setCurrent] = useState(decision);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const highRisk = current.riskLevel === "high" || current.riskLevel === "critical";
  const isPending = current.status === "proposed" || current.status === "awaiting-approval";

  async function resolve(outcome: "approved" | "rejected" | "more-information-required", comment: string) {
    setPending(true);
    setError(null);
    const result = await decideOnDecision(workspace, current.id, outcome, comment);
    setPending(false);
    if (result.ok) setCurrent(result.decision);
    else setError(result.message);
  }

  return (
    <article
      data-tour="tour-decision-card"
      aria-labelledby={`decision-${current.id}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
    >
      <h3 id={`decision-${current.id}`} className="text-sm font-semibold text-ink">
        {proposalLabel}
      </h3>
      <Badge tone={RISK_TONE[current.riskLevel]}>Risk: {current.riskLevel}</Badge>
      <p className="text-sm text-ink-muted">{current.rationale}</p>
      {evidenceLinks.length > 0 ? (
        <p className="text-sm">
          Evidence:{" "}
          {evidenceLinks.map((link, index) => (
            <span key={link.href}>
              {index > 0 ? ", " : null}
              <a href={link.href} className="text-[var(--color-accent)] hover:underline">
                {link.label}
              </a>
            </span>
          ))}
        </p>
      ) : null}
      <p className="text-sm">
        Triggering rule:{" "}
        {triggeringRule !== null ? (
          <a href={triggeringRule.href} className="text-[var(--color-accent)] hover:underline">
            {triggeringRule.label}
          </a>
        ) : (
          <span className="text-ink-muted">Not recorded</span>
        )}
      </p>
      <p className="text-sm text-ink-muted">Potential consequence: {potentialConsequence}</p>
      <p className="text-sm text-ink-muted">Required approver: {requiredApprover}</p>

      {error !== null ? (
        <p role="alert" className="rounded-md border border-[var(--color-critical-ink)] bg-[var(--color-critical-surface)] p-2 text-xs text-[var(--color-critical-ink)]">
          {error}
        </p>
      ) : null}

      {isPending ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {highRisk ? (
            <>
              <ConfirmDialog
                trigger={<Button type="button" disabled={pending}>Approve</Button>}
                title="Approve this decision?"
                description="This is a high-risk decision. A comment is required before approving."
                confirmLabel="Approve"
                requireComment
                onConfirm={(comment) => void resolve("approved", comment)}
              />
              <ConfirmDialog
                trigger={<Button type="button" variant="danger" disabled={pending}>Reject</Button>}
                title="Reject this decision?"
                description="This is a high-risk decision. A comment is required before rejecting."
                confirmLabel="Reject"
                requireComment
                onConfirm={(comment) => void resolve("rejected", comment)}
              />
            </>
          ) : (
            <>
              <Button type="button" disabled={pending} onClick={() => void resolve("approved", "")}>
                Approve
              </Button>
              <Button type="button" variant="danger" disabled={pending} onClick={() => void resolve("rejected", "")}>
                Reject
              </Button>
            </>
          )}
          <ConfirmDialog
            trigger={<Button type="button" variant="secondary" disabled={pending}>Request more information</Button>}
            title="Request more information?"
            description="Add an optional comment describing what is needed before this decision can be approved or rejected."
            confirmLabel="Request more information"
            onConfirm={(comment) => void resolve("more-information-required", comment)}
          />
        </div>
      ) : (
        <p className="mt-2 text-sm font-medium text-ink">Status: {STATUS_LABEL[current.status]}</p>
      )}
    </article>
  );
}
