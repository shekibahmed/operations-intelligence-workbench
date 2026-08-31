import { InboxTable } from "@/app/w/[workspace]/inbox/InboxTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import {
  findEntityById,
  getPackLabels,
  stubArtifacts,
  stubCases,
  stubObservations,
  stubSources,
} from "@/lib/stub";
import { SESSION_MINUTES_REMAINING } from "@/lib/stub/workspace";
import { resolveScreenState } from "@/types/screen-state";

export default async function ArtifactInboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await params;
  const base = workspaceBase(workspace);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("inbox", `${base}/inbox`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const labels = getPackLabels();

  const rows = stubArtifacts.map((artifact) => {
    const source = stubSources.find((entry) => entry.id === artifact.sourceId);
    const observations = stubObservations.filter((observation) => observation.artifactId === artifact.id);
    const linkedEntityId = observations.find((observation) => observation.entityId !== null)?.entityId ?? null;
    const linkedEntity = linkedEntityId ? (findEntityById(linkedEntityId)?.displayName ?? null) : null;
    const relatedCase = linkedEntityId
      ? stubCases.find((entry) => entry.relatedEntityIds.includes(linkedEntityId) && entry.status !== "closed")
      : undefined;
    return {
      artifact,
      sourceName: source?.name ?? artifact.sourceId,
      linkedEntity,
      observationsFound: observations.length,
      reviewRequired: observations.some((observation) => observation.reviewStatus === "pending"),
      relatedCaseTitle: relatedCase?.title ?? null,
      technicalHref: `${base}/technical/artifacts/${artifact.id}`,
    };
  });

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
      <h1 className="text-lg font-semibold text-ink">Inbox</h1>

      {state === "error" ? (
        <ErrorState message="Could not load the artifact inbox." />
      ) : state === "loading" ? (
        <Skeleton className="h-64" label="Loading artifact inbox" />
      ) : state === "empty" || rows.length === 0 ? (
        <EmptyState title="No artifacts have arrived yet" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface p-2">
          <InboxTable rows={rows} />
        </div>
      )}
    </WorkspaceShell>
  );
}
