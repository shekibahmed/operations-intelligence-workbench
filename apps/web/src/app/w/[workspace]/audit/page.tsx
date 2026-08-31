import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { getRepositories } from "@/lib/server/db";
import { getWorkspaceContext } from "@/lib/server/context";
import { minutesRemaining } from "@/lib/session-time";
import { resolveScreenState } from "@/types/screen-state";

export default async function AuditExplorerPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug } = await params;
  const base = workspaceBase(slug);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("audit", `${base}/audit`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const { workspace, labels } = await getWorkspaceContext(slug);

  const repositories = getRepositories();
  const entries = [...(await repositories.auditEntries.list(workspace.id))].sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt),
  );
  const rawEntryParam = rawSearchParams.entry;
  const highlightedEntryId = Array.isArray(rawEntryParam) ? rawEntryParam[0] : rawEntryParam;

  return (
    <WorkspaceShell section="audit"
      workspace={slug}
      packName={labels.packName}
      packId={labels.packId}
      lens={lens}
      sessionMinutesRemaining={minutesRemaining(workspace.expiresAt)}
      defaultArtifactId={DEFAULT_ARTIFACT_ID}
      defaultRuleId={DEFAULT_RULE_ID}
    >
      <h1 className="text-lg font-semibold text-ink">Audit</h1>

      {state === "error" ? (
        <ErrorState message="Could not load the audit log." />
      ) : entries.length === 0 ? (
        <EmptyState title="No audit entries yet" />
      ) : (
        <ol data-tour="tour-audit-list" className="flex flex-col gap-2">
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
