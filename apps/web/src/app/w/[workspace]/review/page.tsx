import { ReviewQueuePanel } from "@/app/w/[workspace]/review/ReviewQueuePanel";
import type { ReviewQueueEntry } from "@/app/w/[workspace]/review/ReviewQueuePanel";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { findArtifactById, getPackLabels, stubReviewQueue } from "@/lib/stub";
import { SESSION_MINUTES_REMAINING } from "@/lib/stub/workspace";
import { resolveScreenState } from "@/types/screen-state";

export default async function ReviewQueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await params;
  const base = workspaceBase(workspace);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("review", `${base}/review`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const labels = getPackLabels();

  const entries: ReviewQueueEntry[] = stubReviewQueue.map((item) => {
    const artifact = findArtifactById(item.observation.artifactId);
    return {
      id: item.observation.id,
      schemaKey: item.observation.schemaKey,
      value: String(item.observation.value ?? "—"),
      confidence: item.observation.confidence ?? 0,
      alternativeCandidate: item.alternativeCandidate,
      evidenceCitation: item.rawExcerpt,
      rawText: artifact?.rawText ?? "",
      rawExcerpt: item.rawExcerpt,
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
      <h1 className="text-lg font-semibold text-ink">Review Queue</h1>

      {state === "loading" ? (
        <Skeleton className="h-96" label="Loading review queue" />
      ) : (
        <ReviewQueuePanel entries={state === "empty" ? [] : entries} forcedError={state === "error"} />
      )}
    </WorkspaceShell>
  );
}
