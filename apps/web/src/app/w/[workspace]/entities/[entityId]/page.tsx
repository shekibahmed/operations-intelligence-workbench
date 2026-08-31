import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionCard } from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { StatCard } from "@/components/widgets/StatCard";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import {
  casesForEntity,
  eventsForEntity,
  findEntityById,
  getPackLabels,
  resolveLabel,
  stubArtifacts,
  stubEntities,
  stubObservations,
  stubSignals,
} from "@/lib/stub";
import { SESSION_MINUTES_REMAINING } from "@/lib/stub/workspace";
import { resolveScreenState } from "@/types/screen-state";

export default async function EntityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; entityId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace, entityId } = await params;
  const base = workspaceBase(workspace);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("entity-detail", `${base}/entities/${entityId}`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const labels = getPackLabels();

  const entity = findEntityById(entityId);
  if (!entity) notFound();

  const relatedArtifactIds = new Set(
    stubObservations.filter((observation) => observation.entityId === entity.id).map((observation) => observation.artifactId),
  );
  const relatedArtifacts = stubArtifacts.filter((artifact) => relatedArtifactIds.has(artifact.id));
  const events = eventsForEntity(entity.id);
  const openCases = casesForEntity(entity.id, "open");
  const closedCases = casesForEntity(entity.id, "closed");
  const patternSignal = stubSignals.find((signal) => signal.eventIds.some((eventId) => events.some((event) => event.id === eventId)));
  const relatedEntities = stubEntities.filter(
    (candidate) =>
      candidate.id !== entity.id &&
      candidate.attributes.location !== undefined &&
      candidate.attributes.location === entity.attributes.location,
  );

  return (
    <WorkspaceShell
      workspace={workspace}
      packName={labels.packName}
      packId={labels.packId}
      lens={lens}
      sessionMinutesRemaining={SESSION_MINUTES_REMAINING}
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
      ) : state === "loading" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton key={index} className="h-32" label="Loading entity section" />
          ))}
        </div>
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
                      <dd className="text-ink">{String(value)}</dd>
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
              {patternSignal ? (
                <p className="text-sm text-ink-muted">{patternSignal.rationale}</p>
              ) : (
                <p className="text-sm text-ink-muted">No repeated patterns detected.</p>
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
