import { ErrorState } from "@/components/ui/ErrorState";
import { SectionCard } from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { getPackLabels } from "@/lib/stub";
import { stubMetricDefinitions } from "@/lib/stub/metrics";
import { stubRuleTrace } from "@/lib/stub/rule-trace";
import { SESSION_MINUTES_REMAINING } from "@/lib/stub/workspace";
import { resolveScreenState } from "@/types/screen-state";

const DASHBOARD_WIDGETS = ["stat-card", "severity-breakdown", "sla-table", "trend-line", "text-impact", "activity-feed", "pending-approvals"];

export default async function AboutPackPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await params;
  const base = workspaceBase(workspace);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("about-pack", `${base}/about-pack`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const labels = getPackLabels();

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
      <header>
        <h1 className="text-lg font-semibold text-ink">{labels.packName}</h1>
        <p className="mt-1 text-sm text-ink-muted">{labels.packDescription}</p>
      </header>

      {state === "error" ? (
        <ErrorState message="Could not load the pack manifest." />
      ) : state === "loading" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-32" label="Loading manifest section" />
          ))}
        </div>
      ) : (
        <>
          <SectionCard title="Entity types">
            <ul className="flex flex-wrap gap-2 text-sm">
              {Object.entries(labels.entityTypes).map(([key, value]) => (
                <li key={key} className="rounded-full border border-border px-3 py-1">{value.singular}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Event types">
            <ul className="flex flex-wrap gap-2 text-sm">
              {Object.entries(labels.eventTypes).map(([key, value]) => (
                <li key={key} className="rounded-full border border-border px-3 py-1">{value}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Rules">
            <a href={`${base}/technical/rules/${stubRuleTrace.ruleId}`} className="text-sm text-[var(--color-accent)] hover:underline">
              {stubRuleTrace.ruleId} v{stubRuleTrace.ruleVersion}
            </a>
            <p className="mt-1 text-sm text-ink-muted">{stubRuleTrace.description}</p>
          </SectionCard>

          <SectionCard title="Workflows">
            <ul className="flex flex-wrap gap-2 text-sm">
              {Object.entries(labels.workflowStates).map(([key, value]) => (
                <li key={key} className="rounded-full border border-border px-3 py-1">{value}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Metrics">
            <ul className="flex flex-col gap-1 text-sm">
              {stubMetricDefinitions.map((metric) => (
                <li key={metric.id}>
                  <span className="font-medium text-ink">{metric.name}</span> — {metric.description}{" "}
                  <span className="text-xs text-ink-muted">({metric.classification})</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Dashboard definitions">
            <ul className="flex flex-wrap gap-2 text-sm">
              {DASHBOARD_WIDGETS.map((widget) => (
                <li key={widget} className="rounded-full border border-border px-3 py-1">{widget.replace(/-/g, " ")}</li>
              ))}
            </ul>
          </SectionCard>

          <p className="border-t border-border pt-4 text-sm text-ink-muted">
            None of this is hard-coded in the platform — it is all configuration read from this
            pack&apos;s manifest.
          </p>
        </>
      )}
    </WorkspaceShell>
  );
}
