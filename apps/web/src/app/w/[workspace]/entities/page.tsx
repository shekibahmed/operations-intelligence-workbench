import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { DemoPreviewNotice } from "@/components/shell/DemoPreviewNotice";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { casesForEntity, resolveLabel, stubEntities } from "@/lib/stub";
import { getWorkspaceContext } from "@/lib/server/context";
import { minutesRemaining } from "@/lib/session-time";
import type { Entity } from "@oiw/contracts";
import { resolveScreenState } from "@/types/screen-state";

export default async function EntityListPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug } = await params;
  const base = workspaceBase(slug);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("entities", `${base}/entities`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const { workspace, labels } = await getWorkspaceContext(slug);

  const columns: DataTableColumn<Entity>[] = [
    { key: "name", header: "Display name", render: (row) => row.displayName },
    { key: "type", header: "Entity type", render: (row) => resolveLabel(labels, "entityTypes", row.entityType) },
    { key: "status", header: "Status", render: (row) => <Badge>{row.status}</Badge> },
    {
      key: "openCases",
      header: "Open cases",
      render: (row) => casesForEntity(row.id, "open").length,
      collapseOnTablet: true,
    },
    { key: "lastActivity", header: "Last activity", render: (row) => new Date(row.updatedAt).toLocaleDateString(), collapseOnTablet: true },
  ];

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
      <h1 className="text-lg font-semibold text-ink">Entities</h1>
      <DemoPreviewNotice />

      {state === "error" ? (
        <ErrorState message="Could not load entities." />
      ) : state === "loading" ? (
        <Skeleton className="h-64" label="Loading entities" />
      ) : state === "empty" || stubEntities.length === 0 ? (
        <EmptyState title="No entities yet" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface p-2">
          <DataTable
            caption="Entities"
            columns={columns}
            rows={stubEntities}
            rowKey={(row) => row.id}
            rowHref={(row) => `${base}/entities/${row.id}`}
          />
        </div>
      )}
    </WorkspaceShell>
  );
}
