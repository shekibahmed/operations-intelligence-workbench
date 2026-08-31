import type { AuditEntry } from "@oiw/contracts";

import { DecisionCard } from "@/app/w/[workspace]/decisions/DecisionCard";
import type { DecisionCardData } from "@/app/w/[workspace]/decisions/DecisionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLabel } from "@/lib/pack-labels";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { getRepositories } from "@/lib/server/db";
import { getWorkspaceContext } from "@/lib/server/context";
import { minutesRemaining } from "@/lib/session-time";
import { resolveScreenState } from "@/types/screen-state";

const RISK_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const PENDING_STATUSES = new Set(["proposed", "awaiting-approval"]);

const CONSEQUENCE_BY_RISK: Record<string, string> = {
  critical: "The underlying critical risk remains unmitigated in the workspace until this decision is resolved.",
  high: "The underlying high risk remains unmitigated until this decision is resolved.",
  medium: "Delaying this decision has a moderate operational impact.",
  low: "No immediate operational impact if this decision is delayed.",
};

function findTriggeringRule(entries: AuditEntry[], decisionId: string): { id: string; version: string } | null {
  const match = entries.find(
    (entry) => entry.subject.type === "decision" && entry.subject.id === decisionId && typeof entry.data["ruleId"] === "string",
  );
  if (match === undefined) return null;
  return { id: String(match.data["ruleId"]), version: String(match.data["ruleVersion"] ?? "") };
}

export default async function DecisionCentrePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug } = await params;
  const base = workspaceBase(slug);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("decisions", `${base}/decisions`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const { workspace, labels } = await getWorkspaceContext(slug);

  const repositories = getRepositories();
  const [allDecisions, auditEntries] = await Promise.all([
    repositories.decisions.list(workspace.id),
    repositories.auditEntries.list(workspace.id),
  ]);
  const decisions = [...allDecisions].sort((a, b) => {
    const pendingDiff = Number(PENDING_STATUSES.has(b.status)) - Number(PENDING_STATUSES.has(a.status));
    if (pendingDiff !== 0) return pendingDiff;
    return (RISK_ORDER[a.riskLevel] ?? 9) - (RISK_ORDER[b.riskLevel] ?? 9);
  });

  const cards: DecisionCardData[] = await Promise.all(
    decisions.map(async (decision) => {
      const rule = findTriggeringRule(auditEntries, decision.id);
      const evidenceLinks = (
        await Promise.all(decision.evidenceSegmentIds.map((id) => repositories.artifactSegments.findById(workspace.id, id)))
      )
        .filter((segment): segment is NonNullable<typeof segment> => segment !== null)
        .map((segment) => ({ label: segment.excerpt ?? segment.id, href: `${base}/technical/artifacts/${segment.artifactId}` }));

      return {
        decision,
        proposalLabel: `${resolveLabel(labels, "decisionTypes", decision.decisionType)}: ${decision.proposal}`,
        triggeringRule: rule !== null ? { label: `${rule.id} v${rule.version}`, href: `${base}/technical/rules/${rule.id}` } : null,
        requiredApprover: resolveLabel(labels, "approvalPolicies", decision.approvalPolicyId),
        potentialConsequence: CONSEQUENCE_BY_RISK[decision.riskLevel] ?? CONSEQUENCE_BY_RISK["low"]!,
        evidenceLinks,
      };
    }),
  );

  return (
    <WorkspaceShell
      workspace={slug}
      packName={labels.packName}
      packId={labels.packId}
      lens={lens}
      sessionMinutesRemaining={minutesRemaining(workspace.expiresAt)}
      defaultArtifactId={DEFAULT_ARTIFACT_ID}
      defaultRuleId={DEFAULT_RULE_ID}
    >
      <h1 className="text-lg font-semibold text-ink">Decisions</h1>

      {state === "error" ? (
        <ErrorState message="Could not load decisions." />
      ) : cards.length === 0 ? (
        <EmptyState
          title="No decisions pending approval"
          description="Decisions are proposed automatically by the case/decision engine's rule outcomes."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {cards.map((card) => (
            <DecisionCard key={card.decision.id} workspace={slug} data={card} />
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}
