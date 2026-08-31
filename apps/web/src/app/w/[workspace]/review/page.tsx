import type { Observation } from "@oiw/contracts";

import { ReviewQueuePanel } from "@/app/w/[workspace]/review/ReviewQueuePanel";
import type { ReviewQueueEntry } from "@/app/w/[workspace]/review/ReviewQueuePanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { formatLocator } from "@/lib/format-locator";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { getRepositories } from "@/lib/server/db";
import { getWorkspaceContext } from "@/lib/server/context";
import { findPackEntry } from "@/lib/server/pack-registry";
import { minutesRemaining } from "@/lib/session-time";
import { resolveScreenState } from "@/types/screen-state";

const QUEUE_STATUSES: ReadonlySet<Observation["reviewStatus"]> = new Set(["pending", "conflicting"]);

export default async function ReviewQueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug } = await params;
  const base = workspaceBase(slug);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("review", `${base}/review`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const { workspace, labels } = await getWorkspaceContext(slug);

  const repositories = getRepositories();
  const [allObservations, packEntry, entities] = await Promise.all([
    repositories.observations.list(workspace.id),
    workspace.activePackId !== null ? findPackEntry(workspace.activePackId) : Promise.resolve(undefined),
    repositories.entities.list(workspace.id),
  ]);
  const entityTypes = (packEntry?.pack.manifest.entityTypes ?? []).map((entityType) => ({
    id: entityType.id,
    displayName: entityType.displayName,
  }));
  const pending = allObservations
    .filter((observation) => QUEUE_STATUSES.has(observation.reviewStatus))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  const entries: ReviewQueueEntry[] = await Promise.all(
    pending.map(async (observation) => {
      const [artifact, segment] = await Promise.all([
        repositories.artifacts.findById(workspace.id, observation.artifactId),
        observation.evidenceSegmentId !== null
          ? repositories.artifactSegments.findById(workspace.id, observation.evidenceSegmentId)
          : Promise.resolve(null),
      ]);
      const definition = packEntry?.pack.observationSchemas.get(observation.schemaKey);
      return {
        observation,
        valueType: definition?.valueType ?? "string",
        rawText: artifact?.rawText ?? null,
        evidence:
          segment === null
            ? null
            : {
                kind: segment.locator.kind,
                label: formatLocator(segment.locator),
                excerpt: segment.excerpt,
                textRange: segment.locator.kind === "text-range" ? { start: segment.locator.start, end: segment.locator.end } : null,
              },
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
      <h1 className="text-lg font-semibold text-ink">Review Queue</h1>

      {state === "error" ? (
        <ErrorState message="Could not load the review queue." />
      ) : entries.length === 0 ? (
        <EmptyState title="Review queue is clear" description="There is nothing pending review right now." />
      ) : (
        <ReviewQueuePanel workspace={slug} entries={entries} entities={entities} entityTypes={entityTypes} labels={labels} />
      )}
    </WorkspaceShell>
  );
}
