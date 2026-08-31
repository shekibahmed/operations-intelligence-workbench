import { DecisionCard } from "@/app/w/[workspace]/decisions/DecisionCard";
import type { DecisionCardData } from "@/app/w/[workspace]/decisions/DecisionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { findSegmentById, getPackLabels, resolveLabel, stubDecisions } from "@/lib/stub";
import { SESSION_MINUTES_REMAINING } from "@/lib/stub/workspace";
import { resolveScreenState } from "@/types/screen-state";

const RISK_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default async function DecisionCentrePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await params;
  const base = workspaceBase(workspace);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("decisions", `${base}/decisions`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const labels = getPackLabels();

  const decisions = [...stubDecisions].sort((a, b) => (RISK_ORDER[a.riskLevel] ?? 9) - (RISK_ORDER[b.riskLevel] ?? 9));

  const cards: DecisionCardData[] = decisions.map((decision) => ({
    decision,
    proposalLabel: `${resolveLabel(labels, "decisionTypes", decision.decisionType)}: ${decision.proposal}`,
    triggeringRule:
      decision.status === "awaiting-approval" || decision.status === "proposed"
        ? { label: "repeat-fault-safety-hold v1.0.0", href: `${base}/technical/rules/repeat-fault-safety-hold` }
        : null,
    requiredApprover: "Any workspace approver",
    potentialConsequence:
      decision.riskLevel === "high" || decision.riskLevel === "critical"
        ? "The asset remains in service with an unresolved safety indicator if this decision is rejected without follow-up."
        : "No immediate operational impact if delayed.",
    evidenceLinks: decision.evidenceSegmentIds
      .map((id) => {
        const segment = findSegmentById(id);
        return segment ? { label: segment.excerpt ?? segment.id, href: `${base}/technical/artifacts/${segment.artifactId}` } : null;
      })
      .filter((entry): entry is { label: string; href: string } => entry !== null),
  }));

  return (
    <WorkspaceShell
      workspace={workspace}
      packName={labels.packName}
      packId={labels.packId}
      lens={lens}
      sessionMinutesRemaining={SESSION_MINUTES_REMAINING}
      defaultArtifactId={DEFAULT_ARTIFACT_ID}
      defaultRuleId={DEFAULT_RULE_ID}
    >
      <h1 className="text-lg font-semibold text-ink">Decisions</h1>

      {state === "loading" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-busy="true">
          <Skeleton className="h-48" label="Loading decisions" />
          <Skeleton className="h-48" label="Loading decisions" />
        </div>
      ) : state === "empty" || cards.length === 0 ? (
        <EmptyState title="No decisions pending approval" />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {cards.map((card, index) => (
            <DecisionCard key={card.decision.id} data={card} forcedError={state === "error" && index === 0} />
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}
