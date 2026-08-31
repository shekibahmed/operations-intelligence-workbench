import { notFound } from "next/navigation";

import { CopyableJson } from "@/components/ui/CopyableJson";
import { InspectorTabs } from "@/components/ui/InspectorTabs";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionCard } from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import {
  findArtifactById,
  findEntityById,
  getPackLabels,
  segmentsForArtifact,
  stubObservations,
} from "@/lib/stub";
import { SESSION_MINUTES_REMAINING } from "@/lib/stub/workspace";
import { resolveScreenState } from "@/types/screen-state";

export default async function TechnicalArtifactInspectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace, id } = await params;
  const base = workspaceBase(workspace);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("technical-artifact", `${base}/technical/artifacts/${id}`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const labels = getPackLabels();

  const artifact = findArtifactById(id);
  if (!artifact) notFound();

  const observations = stubObservations.filter((observation) => observation.artifactId === artifact.id);
  const segments = segmentsForArtifact(artifact.id);
  const entityCandidates = [...new Set(observations.map((observation) => observation.entityId).filter((value): value is string => value !== null))].map(
    (entityId) => findEntityById(entityId),
  );

  return (
    <WorkspaceShell
      workspace={workspace}
      packName={labels.packName}
      packId={labels.packId}
      lens={lens}
      sessionMinutesRemaining={SESSION_MINUTES_REMAINING}
      itemLabel={artifact.artifactType}
      defaultArtifactId={DEFAULT_ARTIFACT_ID}
      defaultRuleId={DEFAULT_RULE_ID}
    >
      <InspectorTabs
        active="artifact"
        artifactHref={`${base}/technical/artifacts/${artifact.id}`}
        ruleHref={`${base}/technical/rules/${DEFAULT_RULE_ID}`}
      />

      {state === "error" ? (
        <ErrorState message="Could not load derived data for this artifact. The raw artifact remains available above." />
      ) : (
        <>
          <SectionCard title="Raw artifact">
            <p className="whitespace-pre-wrap text-sm text-ink">{artifact.rawText ?? "No text content."}</p>
          </SectionCard>

          {state === "loading" ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-40" label="Loading derived data" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard title="Proposed observations">
                {observations.length === 0 ? (
                  <p className="text-sm text-ink-muted">No observations extracted from this artifact.</p>
                ) : (
                  <ul className="flex flex-col gap-3 text-sm">
                    {observations.map((observation) => (
                      <li key={observation.id} className="border-b border-border pb-2 last:border-0">
                        <p className="font-medium text-ink">{observation.schemaKey}</p>
                        {observation.evidenceStatus === "insufficient-evidence" ? (
                          <p className="text-[var(--color-critical-ink)]">
                            Insufficient evidence — {observation.insufficiencyReason}
                          </p>
                        ) : (
                          <p>
                            Value: {String(observation.value)} · Confidence: {Math.round((observation.confidence ?? 0) * 100)}%
                          </p>
                        )}
                        <p className="text-xs text-ink-muted">
                          Review status: {observation.reviewStatus} · Evidence: {segments.find((segment) => segment.id === observation.evidenceSegmentId)?.excerpt ?? "—"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard title="Entity-resolution candidates">
                {entityCandidates.length === 0 ? (
                  <p className="text-sm text-ink-muted">No entity-resolution candidates.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {entityCandidates.map((entity) =>
                      entity ? (
                        <li key={entity.id}>
                          <a href={`${base}/entities/${entity.id}`} className="text-[var(--color-accent)] hover:underline">
                            {entity.displayName}
                          </a>
                        </li>
                      ) : null,
                    )}
                  </ul>
                )}
              </SectionCard>

              <SectionCard title="Parsed representation">
                <p className="text-sm text-ink-muted">Artifact type: {artifact.artifactType} · MIME: {artifact.mimeType}</p>
              </SectionCard>

              <SectionCard title="Provider metadata">
                <dl className="text-sm">
                  <dt className="text-ink-muted">Extractor</dt>
                  <dd className="text-ink">fixture-intelligence-provider v1.0.0</dd>
                  <dt className="mt-2 text-ink-muted">Processing duration</dt>
                  <dd className="text-ink">118 ms</dd>
                </dl>
              </SectionCard>
            </div>
          )}

          <SectionCard title="Structured payload">
            <CopyableJson value={{ artifact, observations, segments }} />
          </SectionCard>
        </>
      )}
    </WorkspaceShell>
  );
}
