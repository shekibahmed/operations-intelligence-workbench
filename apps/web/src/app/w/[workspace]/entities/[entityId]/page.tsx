import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionCard } from "@/components/ui/SectionCard";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { StatCard } from "@/components/widgets/StatCard";
import { buildEntityDetailView } from "@/lib/entity-detail";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLabel } from "@/lib/pack-labels";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { getRepositories } from "@/lib/server/db";
import { getWorkspaceContext } from "@/lib/server/context";
import { minutesRemaining } from "@/lib/session-time";
import { resolveScreenState } from "@/types/screen-state";

export default async function EntityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; entityId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug, entityId } = await params;
  const base = workspaceBase(slug);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("entity-detail", `${base}/entities/${entityId}`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const { workspace, labels } = await getWorkspaceContext(slug);

  const repositories = getRepositories();
  const view = await buildEntityDetailView(repositories, workspace.id, entityId);
  if (view === null) notFound();

  const { entity, relatedArtifacts, events, openCases, closedCases, patternSignals, relatedEntities } = view;

  return (
    <WorkspaceShell section="entities-detail"
      workspace={slug}
      packName={labels.packName}
      packId={labels.packId}
      lens={lens}
      sessionMinutesRemaining={minutesRemaining(workspace.expiresAt)}
      itemLabel={entity.displayName}
      defaultArtifactId={DEFAULT_ARTIFACT_ID}
      defaultRuleId={DEFAULT_RULE_ID}
    >
      <header>
        <p className="text-xs uppercase tracking-wide text-ink-muted">{resolveLabel(labels, "entityTypes", entity.entityType)}</p>
        <h1 className="text-lg font-semibold text-ink">{entity.displayName}</h1>
      </header>

      {state === "error" ? (
        <ErrorState message="Could not load entity sections." />
      ) : (
        <div className="xl:grid xl:grid-cols-2 xl:grid-rows-5 xl:items-start xl:gap-4">
          <div className="xl:col-start-2 xl:row-start-1">
            <SectionCard title="Attributes">
              {Object.keys(entity.attributes).length === 0 ? (
                <p className="text-sm text-ink-muted">No attributes recorded.</p>
              ) : (
                <dl className="text-sm">
                  {Object.entries(entity.attributes).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-2 border-b border-border py-1 last:border-0">
                      <dt className="text-ink-muted">{key}</dt>
                      <dd className="text-ink">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </SectionCard>
          </div>

          <div className="mt-4 xl:col-start-2 xl:row-start-2 xl:mt-0">
            <SectionCard title="Current status">
              <Badge>{entity.status}</Badge>
            </SectionCard>
          </div>

          <div className="mt-4 xl:col-start-1 xl:row-start-2 xl:mt-0">
            <SectionCard title="Related artifacts">
              {relatedArtifacts.length === 0 ? (
                <p className="text-sm text-ink-muted">No related artifacts.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {relatedArtifacts.map((artifact) => (
                    <li key={artifact.id}>
                      <a href={`${base}/technical/artifacts/${artifact.id}`} className="text-[var(--color-accent)] hover:underline">
                        {artifact.artifactType}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <div className="mt-4 xl:col-start-1 xl:row-start-1 xl:mt-0">
            <SectionCard title="Event history">
              {events.length === 0 ? (
                <p className="text-sm text-ink-muted">No event history yet.</p>
              ) : (
                <ol className="flex flex-col gap-2 text-sm">
                  {events.map((event) => (
                    <li key={event.id}>
                      <time dateTime={event.occurredAt} className="block text-xs text-ink-muted">
                        {new Date(event.occurredAt).toLocaleString()}
                      </time>
                      {resolveLabel(labels, "eventTypes", event.eventType)}
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>
          </div>

          <div className="mt-4 xl:col-start-1 xl:row-start-3 xl:mt-0">
            <SectionCard title="Open cases">
              {openCases.length === 0 ? (
                <p className="text-sm text-ink-muted">No open cases.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {openCases.map((entry) => (
                    <li key={entry.id}>
                      <a href={`${base}/cases/${entry.id}`} className="text-[var(--color-accent)] hover:underline">
                        {entry.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <div className="mt-4 xl:col-start-1 xl:row-start-4 xl:mt-0">
            <SectionCard title="Closed cases">
              {closedCases.length === 0 ? (
                <p className="text-sm text-ink-muted">No closed cases.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {closedCases.map((entry) => (
                    <li key={entry.id}>
                      <a href={`${base}/cases/${entry.id}`} className="text-[var(--color-accent)] hover:underline">
                        {entry.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <div className="mt-4 xl:col-start-1 xl:row-start-5 xl:mt-0">
            <SectionCard title="Repeated patterns">
              {patternSignals.length === 0 ? (
                <p className="text-sm text-ink-muted">No repeated patterns detected.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {patternSignals.map((signal) => (
                    <li key={signal.id}>
                      <a href={`${base}/technical/rules/${signal.rule.id}`} className="text-[var(--color-accent)] hover:underline">
                        {resolveLabel(labels, "signalTypes", signal.signalType)}
                      </a>
                      <span className="ml-2 text-xs text-ink-muted">{signal.rationale}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <div className="mt-4 xl:col-start-2 xl:row-start-3 xl:mt-0">
            <SectionCard title="Metrics">
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Open cases" value={openCases.length} classification="calculated" />
                <StatCard label="Related artifacts" value={relatedArtifacts.length} classification="calculated" />
              </div>
            </SectionCard>
          </div>

          <div className="mt-4 xl:col-start-2 xl:row-start-4 xl:mt-0">
            <SectionCard title="Related entities">
              {relatedEntities.length === 0 ? (
                <p className="text-sm text-ink-muted">No related entities.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {relatedEntities.map((candidate) => (
                    <li key={candidate.id}>
                      <a href={`${base}/entities/${candidate.id}`} className="rounded-full border border-border px-3 py-1 text-sm text-[var(--color-accent)] hover:underline">
                        {candidate.displayName}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
