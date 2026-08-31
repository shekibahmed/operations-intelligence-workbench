import Link from "next/link";

import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { ActivityFeed } from "@/components/widgets/ActivityFeed";
import { PendingApprovalsCard } from "@/components/widgets/PendingApprovalsCard";
import { SeverityBreakdown } from "@/components/widgets/SeverityBreakdown";
import { SlaTable } from "@/components/widgets/SlaTable";
import { StatCard } from "@/components/widgets/StatCard";
import { TextImpactCard } from "@/components/widgets/TextImpactCard";
import { TrendLine } from "@/components/widgets/TrendLine";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { getPackLabels, stubAuditEntries, stubDecisions } from "@/lib/stub";
import { overviewMetrics } from "@/lib/stub/metrics";
import { SESSION_MINUTES_REMAINING } from "@/lib/stub/workspace";
import { resolveScreenState } from "@/types/screen-state";

export default async function LeadershipOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await params;
  const base = workspaceBase(workspace);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("overview", `${base}/overview`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const labels = getPackLabels();

  const pendingDecisions = stubDecisions.filter((decision) => decision.status === "awaiting-approval");

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
      <h1 className="text-lg font-semibold text-ink">Overview</h1>

      {state === "error" ? (
        <ErrorState message="Could not load the overview." />
      ) : state === "loading" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-32" label="Loading widget" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Critical signals"
              value={state === "empty" ? 0 : overviewMetrics.criticalSignals.value}
              classification={overviewMetrics.criticalSignals.classification}
              subtext={state === "empty" ? "No critical signals yet — process an artifact to begin." : undefined}
              href={state === "empty" ? `${base}/inbox` : undefined}
            />
            <StatCard
              label="Open cases"
              value={state === "empty" ? 0 : overviewMetrics.openCases.value}
              classification={overviewMetrics.openCases.classification}
              href={`${base}/cases`}
            />
            <StatCard
              label="Pending decisions"
              value={state === "empty" ? 0 : overviewMetrics.pendingDecisions.value}
              classification={overviewMetrics.pendingDecisions.classification}
              href={`${base}/decisions`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SeverityBreakdown
              title="Open cases by severity"
              tiers={
                state === "empty"
                  ? [
                      { key: "critical", label: "Critical", count: 0 },
                      { key: "high", label: "High", count: 0 },
                    ]
                  : [
                      { key: "critical", label: "Critical", count: 1, href: `${base}/cases?severity=critical` },
                      { key: "high", label: "High", count: 0 },
                      { key: "medium", label: "Medium", count: 0 },
                      { key: "low", label: "Low", count: 1, href: `${base}/cases?severity=low` },
                    ]
              }
            />
            <SlaTable
              title="SLA risk"
              emptyMessage="No cases due within the risk window."
              rows={
                state === "empty"
                  ? []
                  : [
                      { key: "case-open", name: "Repeat brake-assembly fault — AR-1042", dueLabel: "Sep 2, 5:00 PM", risk: "at-risk", href: `${base}/cases` },
                      { key: "case-open-2", name: "Scheduled inspection follow-up — AR-2071", dueLabel: "Sep 10, 5:00 PM", risk: "on-track", href: `${base}/cases` },
                    ]
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TrendLine
              title="New signals per week"
              seriesLabel="Signals"
              points={[
                { label: "Wk 1", value: 0 },
                { label: "Wk 2", value: 1 },
                { label: "Wk 3", value: 0 },
                { label: "Wk 4", value: state === "empty" ? 0 : 1 },
              ]}
            />
            <TextImpactCard
              heading="Repeated pattern"
              body={
                state === "empty"
                  ? "No repeated patterns detected yet."
                  : "AR-1042 has had two related brake-assembly faults within the last 30 days."
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TextImpactCard
              heading="Impact hypothesis"
              body="If this repeat-fault pattern continues unaddressed, illustrative downtime exposure could reach the figure below. This is not a measured result."
              metric={state === "empty" ? undefined : overviewMetrics.illustrativeDowntimeExposure}
            />
            <ActivityFeed
              auditHref={`${base}/audit`}
              entries={
                state === "empty"
                  ? []
                  : stubAuditEntries.slice(-4).reverse().map((entry) => ({
                      key: entry.id,
                      timestamp: entry.occurredAt,
                      summary: entry.cause,
                    }))
              }
            />
          </div>

          {pendingDecisions.length > 0 ? (
            <PendingApprovalsCard
              viewAllHref={`${base}/decisions`}
              approvals={pendingDecisions.map((decision) => ({
                key: decision.id,
                title: decision.proposal,
                riskLevel: decision.riskLevel,
                href: `${base}/decisions`,
              }))}
            />
          ) : null}

          <div className="flex flex-wrap gap-4 border-t border-border pt-4 text-sm">
            <Link href={`${base}/inbox`} className="font-medium text-[var(--color-accent)] hover:underline">
              View operational queue
            </Link>
            <Link
              href={`${base}/technical/artifacts/${DEFAULT_ARTIFACT_ID}`}
              className="font-medium text-[var(--color-accent)] hover:underline"
            >
              Inspect how this was derived
            </Link>
          </div>
        </>
      )}
    </WorkspaceShell>
  );
}
