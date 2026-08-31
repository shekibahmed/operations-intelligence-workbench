import Link from "next/link";

import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { DashboardGrid } from "@/components/widgets/DashboardGrid";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { getRepositories } from "@/lib/server/db";
import { getWorkspaceContext } from "@/lib/server/context";
import { evaluateMetrics } from "@/lib/server/metrics";
import { findPackEntry } from "@/lib/server/pack-registry";
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

  const packEntry = workspace.activePackId !== null ? await findPackEntry(workspace.activePackId) : undefined;
  const dashboard = packEntry?.pack.dashboards[lens];
  const values = packEntry !== undefined ? await evaluateMetrics(packEntry, getRepositories(), workspace.id, base, labels) : undefined;

  return (
    <WorkspaceShell section="overview"
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
      ) : dashboard === undefined || values === undefined ? (
        <EmptyState title="No dashboard configured" description="This pack has not published a dashboard for this lens." />
      ) : (
        <>
          <DashboardGrid dashboard={dashboard} values={values} base={base} />

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
