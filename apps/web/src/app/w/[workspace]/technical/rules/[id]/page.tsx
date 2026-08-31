import { notFound } from "next/navigation";

import { ConditionTree } from "@/components/widgets/ConditionTree";
import { ErrorState } from "@/components/ui/ErrorState";
import { InspectorTabs } from "@/components/ui/InspectorTabs";
import { SectionCard } from "@/components/ui/SectionCard";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { buildRuleTraceView, resolveOutcomes } from "@/lib/rule-trace";
import { workspaceBase } from "@/lib/routes";
import { getRepositories } from "@/lib/server/db";
import { getWorkspaceContext } from "@/lib/server/context";
import { minutesRemaining } from "@/lib/session-time";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { resolveScreenState } from "@/types/screen-state";

export default async function TechnicalRuleTracePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug, id } = await params;
  const base = workspaceBase(slug);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("technical-rule", `${base}/technical/rules/${id}`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const { workspace, labels } = await getWorkspaceContext(slug);

  const rawEventParam = rawSearchParams.event;
  const eventId = Array.isArray(rawEventParam) ? rawEventParam[0] : rawEventParam;

  const repositories = getRepositories();
  const auditEntries = await repositories.auditEntries.list(workspace.id);
  const view = buildRuleTraceView(auditEntries, id, eventId);
  if (view === null) notFound();

  const outcomes = resolveOutcomes(view, auditEntries);
  const linkedAuditEntryIds = [...new Set([view.evaluation.id, ...outcomes.map((outcome) => outcome.auditEntryId).filter((entryId): entryId is string => entryId !== null)])];

  return (
    <WorkspaceShell
      workspace={slug}
      packName={labels.packName}
      packId={labels.packId}
      lens={lens}
      sessionMinutesRemaining={minutesRemaining(workspace.expiresAt)}
      itemLabel={view.ruleId}
      defaultArtifactId={DEFAULT_ARTIFACT_ID}
      defaultRuleId={DEFAULT_RULE_ID}
    >
      <InspectorTabs
        active="rule"
        artifactHref={`${base}/technical/artifacts/${DEFAULT_ARTIFACT_ID}`}
        ruleHref={`${base}/technical/rules/${view.ruleId}`}
      />

      {state === "error" ? (
        <ErrorState message="Could not load this rule trace." />
      ) : (
        <>
          <SectionCard title="Rule identity">
            <p className="text-sm text-ink">
              {view.ruleId} · v{view.ruleVersion}
            </p>
            <p className="mt-1 text-sm text-ink-muted">{view.description}</p>
            <p className="mt-1 text-xs text-ink-muted">
              Evaluated {new Date(view.occurredAt).toLocaleString()} against event <code>{view.eventId}</code> —{" "}
              {view.result ? "condition matched" : "condition did not match"}.
            </p>
          </SectionCard>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard title="Fact evaluation">
              {view.facts.length === 0 ? (
                <p className="text-sm text-ink-muted">This rule's condition references no facts.</p>
              ) : (
                <table className="w-full text-sm">
                  <caption className="sr-only">Fact evaluation</caption>
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
                      <th scope="col" className="py-1">Fact</th>
                      <th scope="col" className="py-1">Resolved value</th>
                      <th scope="col" className="py-1">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.facts.map((fact) => (
                      <tr key={fact.label} className="border-t border-border">
                        <td className="py-1">{fact.label}</td>
                        <td className="py-1">{fact.resolvedValue}</td>
                        <td className="py-1 text-ink-muted">{fact.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>

            <div data-tour="tour-condition-tree">
              <SectionCard title="Condition tree">
                <ConditionTree root={view.condition} />
              </SectionCard>
            </div>
          </div>

          <SectionCard title="Outcome">
            {!view.result ? (
              <p className="text-sm text-ink">Condition did not match — no actions fired.</p>
            ) : outcomes.length === 0 ? (
              <p className="text-sm text-ink-muted">No actions fired.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {outcomes.map((outcome, index) => (
                  <li key={index} className={outcome.integrationPoint ? "rounded-md border border-dashed border-border p-2" : undefined}>
                    <p className="font-medium text-ink">{outcome.definitionId} ({outcome.actionType})</p>
                    <p className="text-ink-muted">{outcome.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="State-transition trace">
            {!view.result || outcomes.length === 0 ? (
              <p className="text-sm text-ink-muted">No actions fired — no state transition.</p>
            ) : (
              <ol className="list-decimal pl-5 text-sm text-ink">
                {outcomes.map((outcome, index) => (
                  <li key={index}>{outcome.stateTransition}</li>
                ))}
              </ol>
            )}
          </SectionCard>

          <SectionCard title="Linked audit entries">
            <ul className="flex flex-col gap-1 text-sm">
              {linkedAuditEntryIds.map((entryId) => (
                <li key={entryId}>
                  <a href={`${base}/audit?entry=${entryId}#${entryId}`} className="text-[var(--color-accent)] hover:underline">
                    {entryId}
                  </a>
                </li>
              ))}
            </ul>
          </SectionCard>
        </>
      )}
    </WorkspaceShell>
  );
}
