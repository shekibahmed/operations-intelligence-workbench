import Link from "next/link";

import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { DemoPreviewNotice } from "@/components/shell/DemoPreviewNotice";
import { ActivityFeed } from "@/components/widgets/ActivityFeed";
import { ListCard } from "@/components/widgets/ListCard";
import { SeverityBreakdown } from "@/components/widgets/SeverityBreakdown";
import { SlaTable } from "@/components/widgets/SlaTable";
import { StatCard } from "@/components/widgets/StatCard";
import { TextImpactCard } from "@/components/widgets/TextImpactCard";
import { TrendLine } from "@/components/widgets/TrendLine";
import { ErrorState } from "@/components/ui/ErrorState";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { getRepositories } from "@/lib/server/db";
import { getWorkspaceContext } from "@/lib/server/context";
import { minutesRemaining } from "@/lib/session-time";
import { resolveScreenState } from "@/types/screen-state";

export default async function LeadershipOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug } = await params;
  const base = workspaceBase(slug);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("overview", `${base}/overview`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const { workspace, labels } = await getWorkspaceContext(slug);

  const repositories = getRepositories();
  const [artifacts, sources, cases, decisions, auditEntries] = await Promise.all([
    repositories.artifacts.list(workspace.id),
    repositories.sources.list(workspace.id),
    repositories.cases.list(workspace.id),
    repositories.decisions.list(workspace.id),
    repositories.auditEntries.list(workspace.id),
  ]);

  const openCases = cases.filter((entry) => entry.status !== "closed");
  const pendingDecisions = decisions.filter((entry) => entry.status === "awaiting-approval" || entry.status === "proposed");
  const hasProcessedData = cases.length > 0 || decisions.length > 0;

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
      <h1 className="text-lg font-semibold text-ink">Overview</h1>

      {state === "error" ? (
        <ErrorState message="Could not load the overview." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Critical signals"
              value={0}
              classification="calculated"
              subtext="No critical signals yet — process an artifact to begin."
              href={`${base}/inbox`}
            />
            <StatCard label="Open cases" value={openCases.length} classification="calculated" href={`${base}/cases`} />
            <StatCard
              label="Pending decisions"
              value={pendingDecisions.length}
              classification="calculated"
              href={`${base}/decisions`}
            />
          </div>

          <ListCard
            title="Workspace data"
            viewAllHref={`${base}/inbox`}
            emptyMessage="No sources or artifacts loaded yet."
            items={[
              { key: "artifacts", title: `${artifacts.length} artifacts ingested`, supportingLine: "Received into this guest workspace at seed time." },
              { key: "sources", title: `${sources.length} sources connected`, supportingLine: "Fixture sources declared by the active pack." },
            ]}
          />

          <DemoPreviewNotice />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SeverityBreakdown
              title="Open cases by severity"
              tiers={
                hasProcessedData
                  ? [
                      { key: "critical", label: "Critical", count: 1, href: `${base}/cases?severity=critical` },
                      { key: "high", label: "High", count: 0 },
                      { key: "medium", label: "Medium", count: 0 },
                      { key: "low", label: "Low", count: 1, href: `${base}/cases?severity=low` },
                    ]
                  : [
                      { key: "critical", label: "Critical", count: 0 },
                      { key: "high", label: "High", count: 0 },
                    ]
              }
            />
            <SlaTable
              title="SLA risk"
              emptyMessage="No cases due within the risk window."
              rows={
                hasProcessedData
                  ? [
                      { key: "case-open", name: "Repeat brake-assembly fault — AR-1042", dueLabel: "Sep 2, 5:00 PM", risk: "at-risk", href: `${base}/cases` },
                      { key: "case-open-2", name: "Scheduled inspection follow-up — AR-2071", dueLabel: "Sep 10, 5:00 PM", risk: "on-track", href: `${base}/cases` },
                    ]
                  : []
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TrendLine
              title="New signals per week"
              seriesLabel="Signals"
              points={[
                { label: "Wk 1", value: 0 },
                { label: "Wk 2", value: 0 },
                { label: "Wk 3", value: 0 },
                { label: "Wk 4", value: 0 },
              ]}
            />
            <TextImpactCard
              heading="Repeated pattern"
              body={
                hasProcessedData
                  ? "AR-1042 has had two related brake-assembly faults within the last 30 days."
                  : "No repeated patterns detected yet."
              }
            />
          </div>

          <ActivityFeed
            auditHref={`${base}/audit`}
            entries={auditEntries
              .slice(-4)
              .reverse()
              .map((entry) => ({ key: entry.id, timestamp: entry.occurredAt, summary: entry.cause }))}
          />

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
