"use client";

import { useState } from "react";
import type { Decision } from "@oiw/contracts";

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

/**
 * PRD §22.4: a comment is required before Approve/Reject is enabled for a
 * high-risk (or critical) decision, via a focus-managed confirmation dialog
 * rather than `window.confirm()` (UX_SPEC §5.11).
 */
export function DecisionCard({ data, forcedError = false }: { data: DecisionCardData; forcedError?: boolean }) {
  const { decision, proposalLabel, triggeringRule, requiredApprover, potentialConsequence, evidenceLinks } = data;
  const [status, setStatus] = useState(decision.status);
  const [error, setError] = useState(forcedError);
  const highRisk = decision.riskLevel === "high" || decision.riskLevel === "critical";

  function resolve(outcome: "approved" | "rejected" | "more-information-required") {
    if (forcedError) {
      setError(true);
      return;
    }
    setError(false);
    setStatus(outcome === "approved" ? "approved" : outcome === "rejected" ? "rejected" : "more-information-required");
  }

  return (
    <article aria-labelledby={`decision-${decision.id}`} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <h3 id={`decision-${decision.id}`} className="text-sm font-semibold text-ink">
        {proposalLabel}
      </h3>
      <Badge tone={RISK_TONE[decision.riskLevel]}>Risk: {decision.riskLevel}</Badge>
      <p className="text-sm text-ink-muted">{decision.rationale}</p>
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
      {triggeringRule ? (
        <p className="text-sm">
          Triggering rule:{" "}
          <a href={triggeringRule.href} className="text-[var(--color-accent)] hover:underline">
            {triggeringRule.label}
          </a>
        </p>
      ) : null}
      <p className="text-sm text-ink-muted">Potential consequence: {potentialConsequence}</p>
      <p className="text-sm text-ink-muted">Required approver: {requiredApprover}</p>

      {error ? (
        <p role="alert" className="rounded-md border border-[var(--color-critical-ink)] bg-[var(--color-critical-surface)] p-2 text-xs text-[var(--color-critical-ink)]">
          Could not save this decision. It remains pending.
        </p>
      ) : null}

      {status === "awaiting-approval" || status === "proposed" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {highRisk ? (
            <>
              <ConfirmDialog
                trigger={<Button type="button">Approve</Button>}
                title="Approve this decision?"
                description="This is a high-risk decision. A comment is required before approving."
                confirmLabel="Approve"
                requireComment
                onConfirm={() => resolve("approved")}
              />
              <ConfirmDialog
                trigger={<Button type="button" variant="danger">Reject</Button>}
                title="Reject this decision?"
                description="This is a high-risk decision. A comment is required before rejecting."
                confirmLabel="Reject"
                requireComment
                onConfirm={() => resolve("rejected")}
              />
            </>
          ) : (
            <>
              <Button type="button" onClick={() => resolve("approved")}>Approve</Button>
              <Button type="button" variant="danger" onClick={() => resolve("rejected")}>Reject</Button>
            </>
          )}
          <Button type="button" variant="secondary" onClick={() => resolve("more-information-required")}>
            Request more information
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-sm font-medium text-ink">Status: {status.replace(/-/g, " ")}</p>
      )}
    </article>
  );
}
