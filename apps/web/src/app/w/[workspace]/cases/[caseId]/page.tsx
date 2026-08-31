import { notFound } from "next/navigation";

import { ActionItemChecklist } from "@/app/w/[workspace]/cases/[caseId]/ActionItemChecklist";
import { Badge } from "@/components/ui/Badge";
import { DemoPreviewNotice } from "@/components/shell/DemoPreviewNotice";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionCard } from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { buildCaseDetailView } from "@/lib/case-detail";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { resolveLabel } from "@/lib/stub";
import { getWorkspaceContext } from "@/lib/server/context";
import { minutesRemaining } from "@/lib/session-time";
import { resolveScreenState } from "@/types/screen-state";

export default async function CaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; caseId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug, caseId } = await params;
  const base = workspaceBase(slug);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("case-detail", `${base}/cases/${caseId}`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const { workspace, labels } = await getWorkspaceContext(slug);

  const view = buildCaseDetailView(caseId);
  if (!view) notFound();

  const { caseRecord, relatedEntities, evidence, timeline, signals, actionItems, decisions, approvals, closureRequirements } = view;

  return (
    <WorkspaceShell
      workspace={slug}
      packName={labels.packName}
      packId={labels.packId}
      lens={lens}
      sessionMinutesRemaining={minutesRemaining(workspace.expiresAt)}
      itemLabel={caseRecord.title}
      defaultArtifactId={DEFAULT_ARTIFACT_ID}
      defaultRuleId={DEFAULT_RULE_ID}
    >
      <header>
        <p className="text-xs uppercase tracking-wide text-ink-muted">{resolveLabel(labels, "caseTypes", caseRecord.caseType)}</p>
        <h1 className="text-lg font-semibold text-ink">{caseRecord.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{resolveLabel(labels, "workflowStates", caseRecord.status)}</Badge>
          <Badge tone={caseRecord.priority === "urgent" ? "critical" : "neutral"}>Priority: {caseRecord.priority}</Badge>
          <Badge>{caseRecord.owner ?? "Unassigned"}</Badge>
          <Badge tone={caseRecord.dueAt ? "warn" : "neutral"}>
            SLA: {caseRecord.dueAt ? new Date(caseRecord.dueAt).toLocaleDateString() : "No due date"}
          </Badge>
        </div>
      </header>
      <DemoPreviewNotice />

      {state === "error" ? (
        <ErrorState message="Could not load case sections." />
      ) : state === "loading" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-40" label="Loading case section" />
          ))}
        </div>
      ) : (
        <div className="xl:grid xl:grid-cols-2 xl:gap-4">
          <div className="flex flex-col gap-4">
            <SectionCard title="Related entities">
              {relatedEntities.length === 0 ? (
                <p className="text-sm text-ink-muted">No related entities.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {relatedEntities.map((entity) => (
                    <li key={entity.id}>
                      <a href={`${base}/entities/${entity.id}`} className="rounded-full border border-border px-3 py-1 text-sm text-[var(--color-accent)] hover:underline">
                        {entity.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Evidence">
              {evidence.length === 0 ? (
                <p className="text-sm text-ink-muted">No evidence attached yet.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {evidence.map((segment) => (
                    <li key={segment.id}>
                      <a href={`${base}/technical/artifacts/${segment.artifactId}`} className="text-[var(--color-accent)] hover:underline">
                        {segment.excerpt ?? segment.id}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Timeline">
              {timeline.length === 0 ? (
                <p className="text-sm text-ink-muted">No timeline events yet.</p>
              ) : (
                <ol className="flex flex-col gap-2 text-sm">
                  {timeline.map((event) => (
                    <li key={event.id}>
                      <time dateTime={event.occurredAt} className="block text-xs text-ink-muted">
                        {new Date(event.occurredAt).toLocaleString()}
                      </time>
                      <span>{resolveLabel(labels, "eventTypes", event.eventType)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>

            <SectionCard title="Signals">
              {signals.length === 0 ? (
                <p className="text-sm text-ink-muted">No signals yet.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {signals.map((signal) => (
                    <li key={signal.id}>
                      <a href={`${base}/technical/rules/${signal.rule.id}`} className="text-[var(--color-accent)] hover:underline">
                        {resolveLabel(labels, "signalTypes", signal.signalType)}
                      </a>
                      <span className="ml-2 text-xs text-ink-muted">Severity: {signal.severity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <div className="mt-4 flex flex-col gap-4 xl:mt-0">
            <SectionCard title="Action items">
              <ActionItemChecklist items={actionItems} />
            </SectionCard>

            <SectionCard title="Decisions">
              {decisions.length === 0 ? (
                <p className="text-sm text-ink-muted">No decisions proposed yet.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {decisions.map((decision) => (
                    <li key={decision.id}>
                      <a href={`${base}/decisions`} className="text-[var(--color-accent)] hover:underline">
                        {decision.proposal}
                      </a>
                      <span className="ml-2 text-xs text-ink-muted">{decision.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Approval history">
              {approvals.length === 0 ? (
                <p className="text-sm text-ink-muted">No approvals recorded yet.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {approvals.map((approval) => (
                    <li key={approval.id}>
                      <span className="font-medium text-ink">{approval.approver}</span> — {approval.outcome}
                      {approval.comment ? <span className="block text-xs text-ink-muted">{approval.comment}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Closure requirements">
              <ul className="flex flex-col gap-1 text-sm">
                {closureRequirements.map((requirement) => (
                  <li key={requirement.id} className="flex items-center gap-2">
                    <input type="checkbox" checked={requirement.complete} readOnly aria-label={requirement.label} />
                    <span>{requirement.label}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </div>
      )}

      <details open={lens === "technical"} className="mt-4 border-t border-border pt-4">
        <summary className="cursor-pointer text-sm font-medium text-ink">Technical trace</summary>
        <a
          href={`${base}/technical/rules/${signals[0]?.rule.id ?? DEFAULT_RULE_ID}`}
          className="mt-2 inline-block text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          View technical trace
        </a>
      </details>
    </WorkspaceShell>
  );
}
