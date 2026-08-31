import { InboxTable } from "@/app/w/[workspace]/inbox/InboxTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { mapArtifactsToInboxRows } from "@/lib/inbox-mapping";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { getRepositories } from "@/lib/server/db";
import { getWorkspaceContext } from "@/lib/server/context";
import { minutesRemaining } from "@/lib/session-time";
import { resolveScreenState } from "@/types/screen-state";

export default async function ArtifactInboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug } = await params;
  const base = workspaceBase(slug);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("inbox", `${base}/inbox`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const { workspace, labels } = await getWorkspaceContext(slug);

  const repositories = getRepositories();
  const [artifacts, sources, observations] = await Promise.all([
    repositories.artifacts.list(workspace.id),
    repositories.sources.list(workspace.id),
    repositories.observations.list(workspace.id),
  ]);

  const rows = mapArtifactsToInboxRows(artifacts, sources, observations, base);

  return (
    <WorkspaceShell section="inbox"
      workspace={slug}
      packName={labels.packName}
      packId={labels.packId}
      lens={lens}
      sessionMinutesRemaining={minutesRemaining(workspace.expiresAt)}
      defaultArtifactId={DEFAULT_ARTIFACT_ID}
      defaultRuleId={DEFAULT_RULE_ID}
    >
      <h1 className="text-lg font-semibold text-ink">Inbox</h1>

      {state === "error" ? (
        <ErrorState message="Could not load the artifact inbox." />
      ) : rows.length === 0 ? (
        <EmptyState title="No artifacts have arrived yet" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface p-2">
          <InboxTable workspace={slug} rows={rows} />
        </div>
      )}
    </WorkspaceShell>
  );
}
