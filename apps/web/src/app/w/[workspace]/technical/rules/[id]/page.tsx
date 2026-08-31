import { notFound } from "next/navigation";

import { ConditionTree } from "@/components/widgets/ConditionTree";
import { ErrorState } from "@/components/ui/ErrorState";
import { InspectorTabs } from "@/components/ui/InspectorTabs";
import { SectionCard } from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { getPackLabels } from "@/lib/stub";
import { stubRuleTrace } from "@/lib/stub/rule-trace";
import { SESSION_MINUTES_REMAINING } from "@/lib/stub/workspace";
import { resolveScreenState } from "@/types/screen-state";

export default async function TechnicalRuleTracePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace, id } = await params;
  const base = workspaceBase(workspace);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("technical-rule", `${base}/technical/rules/${id}`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const labels = getPackLabels();

  if (id !== stubRuleTrace.ruleId) notFound();

  return (
    <WorkspaceShell
      workspace={workspace}
      packName={labels.packName}
      packId={labels.packId}
      lens={lens}
      sessionMinutesRemaining={SESSION_MINUTES_REMAINING}
      itemLabel={stubRuleTrace.ruleId}
      defaultArtifactId={DEFAULT_ARTIFACT_ID}
      defaultRuleId={DEFAULT_RULE_ID}
    >
      <InspectorTabs
        active="rule"
        artifactHref={`${base}/technical/artifacts/${DEFAULT_ARTIFACT_ID}`}
        ruleHref={`${base}/technical/rules/${stubRuleTrace.ruleId}`}
      />

      {state === "error" ? (
        <ErrorState message="Could not load this rule trace." />
      ) : state === "loading" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-40" label="Loading rule trace" />
          ))}
        </div>
      ) : (
        <>
          <SectionCard title="Rule identity">
            <p className="text-sm text-ink">
              {stubRuleTrace.ruleId} · v{stubRuleTrace.ruleVersion}
            </p>
            <p className="mt-1 text-sm text-ink-muted">{stubRuleTrace.description}</p>
          </SectionCard>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard title="Fact evaluation">
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
                  {stubRuleTrace.facts.map((fact) => (
                    <tr key={fact.fact} className="border-t border-border">
                      <td className="py-1">{fact.fact}</td>
                      <td className="py-1">{fact.resolvedValue}</td>
                      <td className="py-1 text-ink-muted">{fact.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>

            <SectionCard title="Condition tree">
              <ConditionTree root={stubRuleTrace.condition} />
            </SectionCard>
          </div>

          <SectionCard title="Outcome">
            <p className="text-sm text-ink">{stubRuleTrace.outcome}</p>
          </SectionCard>

          <SectionCard title="State-transition trace">
            <ol className="list-decimal pl-5 text-sm text-ink">
              {stubRuleTrace.stateTransitions.map((transition) => (
                <li key={transition}>{transition}</li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard title="Linked audit entries">
            <ul className="flex flex-col gap-1 text-sm">
              {stubRuleTrace.auditEntryIds.map((entryId) => (
                <li key={entryId}>
                  <a href={`${base}/audit?entry=${entryId}`} className="text-[var(--color-accent)] hover:underline">
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
