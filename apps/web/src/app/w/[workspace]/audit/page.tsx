import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { getPackLabels, stubAuditEntries } from "@/lib/stub";
import { SESSION_MINUTES_REMAINING } from "@/lib/stub/workspace";
import { resolveScreenState } from "@/types/screen-state";

export default async function AuditExplorerPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await params;
  const base = workspaceBase(workspace);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("audit", `${base}/audit`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const labels = getPackLabels();

  const entries = [...stubAuditEntries].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const highlightedEntryId = rawSearchParams.entry;

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
      <h1 className="text-lg font-semibold text-ink">Audit</h1>

      {state === "error" ? (
        <ErrorState message="Could not load the audit log." />
      ) : state === "loading" ? (
        <Skeleton className="h-96" label="Loading audit log" />
      ) : state === "empty" || entries.length === 0 ? (
        <EmptyState title="No audit entries yet" />
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              id={entry.id}
              className={`rounded-md border p-3 text-sm ${entry.id === highlightedEntryId ? "border-[var(--color-accent)]" : "border-border"} bg-surface`}
            >
              <time dateTime={entry.occurredAt} className="block text-xs text-ink-muted">
                {new Date(entry.occurredAt).toLocaleString()}
              </time>
              <p className="font-medium text-ink">{entry.action.replace(/-/g, " ")}</p>
              <p className="text-ink-muted">
                Actor: {entry.actor.type} ({entry.actor.id}) · Subject: {entry.subject.type} {entry.subject.id}
              </p>
              <p className="text-ink-muted">{entry.cause}</p>
            </li>
          ))}
        </ol>
      )}
    </WorkspaceShell>
  );
}
