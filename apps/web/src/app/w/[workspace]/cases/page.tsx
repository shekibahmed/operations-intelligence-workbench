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
import { resolveLabel, stubCases } from "@/lib/stub";
import { getWorkspaceContext } from "@/lib/server/context";
import { minutesRemaining } from "@/lib/session-time";
import type { Case } from "@oiw/contracts";
import { resolveScreenState } from "@/types/screen-state";

export default async function CaseListPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug } = await params;
  const base = workspaceBase(slug);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("cases", `${base}/cases`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const { workspace, labels } = await getWorkspaceContext(slug);

  const rows = [...stubCases].sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));

  const columns: DataTableColumn<Case>[] = [
    { key: "title", header: "Case", render: (row) => row.title },
    { key: "status", header: "Status", render: (row) => <Badge>{resolveLabel(labels, "workflowStates", row.status)}</Badge> },
    { key: "priority", header: "Priority", render: (row) => row.priority },
    {
      key: "severity",
      header: "Severity",
      render: (row) => <Badge tone={row.severity === "critical" ? "critical" : row.severity === "high" ? "warn" : "neutral"}>{row.severity}</Badge>,
    },
    { key: "owner", header: "Owner", render: (row) => row.owner ?? "Unassigned" },
    { key: "due", header: "Due date", render: (row) => (row.dueAt ? new Date(row.dueAt).toLocaleDateString() : "—") },
    { key: "entities", header: "Related entities", render: (row) => row.relatedEntityIds.length, collapseOnTablet: true },
    {
      key: "sla",
      header: "SLA",
      render: (row) => (row.status === "closed" ? "Closed" : row.priority === "urgent" ? "At risk" : "On track"),
    },
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
      <h1 className="text-lg font-semibold text-ink">Cases</h1>
      <DemoPreviewNotice />

      {state === "error" ? (
        <ErrorState message="Could not load cases." />
      ) : state === "loading" ? (
        <Skeleton className="h-64" label="Loading cases" />
      ) : state === "empty" || rows.length === 0 ? (
        <EmptyState title="No cases yet" description="Cases are created from the Inbox and Review Queue." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface p-2">
          <DataTable
            caption="Cases"
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            rowHref={(row) => `${base}/cases/${row.id}`}
          />
        </div>
      )}
    </WorkspaceShell>
  );
}
