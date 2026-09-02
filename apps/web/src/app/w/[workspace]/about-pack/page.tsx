import { ErrorState } from "@/components/ui/ErrorState";
import { SectionCard } from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { getWorkspaceContext } from "@/lib/server/context";
import { findPackEntry } from "@/lib/server/pack-registry";
import { minutesRemaining } from "@/lib/session-time";
import { resolveScreenState } from "@/types/screen-state";

export default async function AboutPackPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug } = await params;
  const base = workspaceBase(slug);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("about-pack", `${base}/about-pack`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const { workspace, labels } = await getWorkspaceContext(slug);
  const packEntry = workspace.activePackId !== null ? await findPackEntry(workspace.activePackId) : undefined;
  const rules = packEntry?.pack.rules ?? [];
  const metricDefinitions = packEntry === undefined ? [] : [...packEntry.pack.metricDefinitions.values()];
  const dashboardWidgetTypes =
    packEntry === undefined
      ? []
      : [...new Set(Object.values(packEntry.pack.dashboards).flatMap((dashboard) => dashboard?.widgets.map((widget) => widget.type) ?? []))];

  return (
    <WorkspaceShell section="about-pack"
      workspace={slug}
      packName={labels.packName}
      packId={labels.packId}
      lens={lens}
      sessionMinutesRemaining={minutesRemaining(workspace.expiresAt)}
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

          <SectionCard title="Workflows">
            <ul className="flex flex-wrap gap-2 text-sm">
              {Object.entries(labels.workflowStates).map(([key, value]) => (
                <li key={key} className="rounded-full border border-border px-3 py-1">{value}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Rules">
            {rules.length === 0 ? (
              <p className="text-sm text-ink-muted">This pack defines no rules.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {rules.map((rule) => (
                  <li key={rule.id}>
                    <a href={`${base}/technical/rules/${rule.id}`} className="text-[var(--color-accent)] underline">
                      {rule.id} v{rule.version}
                    </a>
                    <p className="mt-0.5 text-ink-muted">{rule.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Metrics">
            {metricDefinitions.length === 0 ? (
              <p className="text-sm text-ink-muted">This pack defines no metrics.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {metricDefinitions.map((metric) => (
                  <li key={metric.id}>
                    <span className="font-medium text-ink">{metric.name}</span> — {metric.description}{" "}
                    <span className="text-xs text-ink-muted">({metric.classification})</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Dashboard definitions">
            {dashboardWidgetTypes.length === 0 ? (
              <p className="text-sm text-ink-muted">This pack defines no dashboard widgets.</p>
            ) : (
              <ul className="flex flex-wrap gap-2 text-sm">
                {dashboardWidgetTypes.map((widget) => (
                  <li key={widget} className="rounded-full border border-border px-3 py-1">{widget.replace(/-/g, " ")}</li>
                ))}
              </ul>
            )}
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
