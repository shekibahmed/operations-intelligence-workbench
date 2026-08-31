import { notFound } from "next/navigation";
import type { ArtifactSegment, AuditEntry, Observation } from "@oiw/contracts";

import { Badge } from "@/components/ui/Badge";
import { CopyableJson } from "@/components/ui/CopyableJson";
import { InspectorTabs } from "@/components/ui/InspectorTabs";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionCard } from "@/components/ui/SectionCard";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { formatLocator } from "@/lib/format-locator";
import { highlightRanges, type TextHighlightRange } from "@/lib/highlight-text";
import { DEFAULT_ARTIFACT_ID, DEFAULT_RULE_ID } from "@/lib/nav-defaults";
import { formatConfidence, REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from "@/lib/observation-display";
import { resolveLens } from "@/lib/resolve-lens";
import { workspaceBase } from "@/lib/routes";
import { getRepositories } from "@/lib/server/db";
import { getWorkspaceContext } from "@/lib/server/context";
import { minutesRemaining } from "@/lib/session-time";
import { resolveScreenState } from "@/types/screen-state";

const PROCESSING_AUDIT_ACTIONS = new Set([
  "artifact-processing-started",
  "artifact-processing-completed",
  "artifact-processing-failed",
  "extraction-rejected",
]);

function processingAuditEntries(entries: AuditEntry[], artifactId: string): AuditEntry[] {
  return entries
    .filter((entry) => entry.subject.type === "artifact" && entry.subject.id === artifactId)
    .filter((entry) => PROCESSING_AUDIT_ACTIONS.has(entry.action))
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
}

function processingDurationMs(trace: AuditEntry[]): number | null {
  const started = trace.find((entry) => entry.action === "artifact-processing-started");
  const finished = [...trace].reverse().find((entry) => entry.action !== "artifact-processing-started");
  if (started === undefined || finished === undefined) return null;
  return Date.parse(finished.occurredAt) - Date.parse(started.occurredAt);
}

/**
 * Every Observation's evidence span, for the raw-viewer highlight (UX_SPEC
 * §5.12: "reused from Review Queue, §5.6"). Deliberately scoped to
 * Observations' own evidence segments rather than every persisted
 * `ArtifactSegment` — the latter also includes the adapter's coarse parse
 * segments (e.g. one per chat message), which would highlight entire
 * message blocks instead of the specific evidence phrase within them.
 */
function evidenceHighlightRanges(
  observations: Observation[],
  segmentsById: Map<string, ArtifactSegment>,
): TextHighlightRange[] {
  const ranges: TextHighlightRange[] = [];
  for (const observation of observations) {
    if (observation.evidenceSegmentId === null) continue;
    const segment = segmentsById.get(observation.evidenceSegmentId);
    if (segment !== undefined && segment.locator.kind === "text-range") {
      ranges.push({ start: segment.locator.start, end: segment.locator.end });
    }
  }
  return ranges;
}

export default async function TechnicalArtifactInspectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug, id } = await params;
  const base = workspaceBase(slug);
  const rawSearchParams = await searchParams;
  const lens = await resolveLens("technical-artifact", `${base}/technical/artifacts/${id}`, rawSearchParams);
  const state = resolveScreenState(rawSearchParams.state);
  const { workspace, labels } = await getWorkspaceContext(slug);

  const repositories = getRepositories();
  const artifact = await repositories.artifacts.findById(workspace.id, id);
  if (artifact === null) notFound();

  const [segments, observations, auditEntries, entities] = await Promise.all([
    repositories.artifactSegments.listByArtifact(workspace.id, id),
    repositories.observations.listByArtifact(workspace.id, id),
    repositories.auditEntries.list(workspace.id),
    repositories.entities.list(workspace.id),
  ]);
  const segmentsById = new Map<string, ArtifactSegment>(segments.map((segment) => [segment.id, segment]));
  const entitiesById = new Map(entities.map((entity) => [entity.id, entity]));
  const resolvedObservations = observations.filter((observation) => observation.entityId !== null);
  const conflictingObservations = observations.filter(
    (observation) => observation.reviewStatus === "conflicting" && (observation.alternativeCandidates?.length ?? 0) > 0,
  );
  const trace = processingAuditEntries(auditEntries, id);
  const durationMs = processingDurationMs(trace);
  const providerEntry = observations.find((observation) => observation.extractor !== null)?.extractor ?? null;
  const evidenceRanges = evidenceHighlightRanges(observations, segmentsById);

  return (
    <WorkspaceShell section="technical-artifacts"
      workspace={slug}
      packName={labels.packName}
      packId={labels.packId}
      lens={lens}
      sessionMinutesRemaining={minutesRemaining(workspace.expiresAt)}
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
            <p className="whitespace-pre-wrap text-sm text-ink">
              {artifact.rawText === null ? "No text content." : highlightRanges(artifact.rawText, evidenceRanges)}
            </p>
          </SectionCard>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard title="Metadata">
              <dl className="text-sm">
                <dt className="text-ink-muted">Artifact type</dt>
                <dd className="text-ink">{artifact.artifactType}</dd>
                <dt className="mt-2 text-ink-muted">MIME type</dt>
                <dd className="text-ink">{artifact.mimeType}</dd>
                <dt className="mt-2 text-ink-muted">Checksum (SHA-256)</dt>
                <dd className="break-all font-mono text-xs text-ink">{artifact.checksum}</dd>
                <dt className="mt-2 text-ink-muted">Received</dt>
                <dd className="text-ink">{new Date(artifact.receivedAt).toLocaleString()}</dd>
                <dt className="mt-2 text-ink-muted">Processing status</dt>
                <dd className="text-ink">{artifact.processingStatus}</dd>
              </dl>
            </SectionCard>

            <SectionCard title="Segments">
              {segments.length === 0 ? (
                <p className="text-sm text-ink-muted">No segments recorded for this artifact yet.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {segments.map((segment) => (
                    <li key={segment.id} className="border-b border-border pb-2 last:border-0">
                      <p className="font-medium text-ink">{formatLocator(segment.locator)}</p>
                      {segment.excerpt !== null ? <p className="text-ink-muted">{segment.excerpt}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Proposed observations">
              {observations.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No observations yet — this artifact has not been processed (use Process from the Inbox).
                </p>
              ) : (
                <ul className="flex flex-col gap-3 text-sm">
                  {observations.map((observation) => {
                    const segment = observation.evidenceSegmentId !== null ? segmentsById.get(observation.evidenceSegmentId) : undefined;
                    return (
                      <li key={observation.id} className="border-b border-border pb-3 last:border-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-ink">{observation.schemaKey}</p>
                          <Badge tone={REVIEW_STATUS_TONE[observation.reviewStatus]}>{REVIEW_STATUS_LABEL[observation.reviewStatus]}</Badge>
                          <Badge tone="neutral">Confidence: {formatConfidence(observation.confidence)}</Badge>
                        </div>
                        <p className="mt-1 text-ink">
                          {observation.evidenceStatus === "insufficient-evidence"
                            ? `Insufficient evidence — ${observation.insufficiencyReason ?? "no reason recorded"}`
                            : String(observation.value ?? "—")}
                        </p>
                        {segment !== undefined ? (
                          <p className="text-xs text-ink-muted">
                            Evidence: {formatLocator(segment.locator)}
                            {segment.excerpt !== null ? ` — "${segment.excerpt}"` : ""}
                          </p>
                        ) : null}
                        {observation.alternativeCandidates !== undefined && observation.alternativeCandidates.length > 0 ? (
                          <p className="text-xs text-ink-muted">
                            Alternative candidates:{" "}
                            {observation.alternativeCandidates
                              .map((candidate) => `${String(candidate.value)} (${formatConfidence(candidate.confidence)})`)
                              .join(", ")}
                          </p>
                        ) : null}
                        {observation.extractor !== null ? (
                          <p className="text-xs text-ink-muted">
                            Extractor: {observation.extractor.id}@{observation.extractor.version}
                          </p>
                        ) : null}
                        {observation.reviewStatus === "pending" || observation.reviewStatus === "conflicting" ? (
                          <a href={`${base}/review`} className="text-xs font-medium text-[var(--color-accent)] hover:underline">
                            Review this observation
                          </a>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Entity-resolution candidates">
              {resolvedObservations.length === 0 && conflictingObservations.length === 0 ? (
                <p className="text-sm text-ink-muted">No Observation from this Artifact resolved to an Entity.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {resolvedObservations.map((observation) => {
                    const entity = entitiesById.get(observation.entityId!);
                    return (
                      <li key={observation.id}>
                        <span className="font-medium text-ink">{observation.schemaKey}</span> resolved to{" "}
                        {entity !== undefined ? (
                          <a href={`${base}/entities/${entity.id}`} className="text-[var(--color-accent)] hover:underline">
                            {entity.displayName}
                          </a>
                        ) : (
                          <span className="text-ink-muted">{observation.entityId}</span>
                        )}
                        .
                      </li>
                    );
                  })}
                  {conflictingObservations.map((observation) => (
                    <li key={observation.id}>
                      <span className="font-medium text-ink">{observation.schemaKey}</span> is ambiguous — candidates:{" "}
                      {observation.alternativeCandidates!.map((candidate, index) => (
                        <span key={index}>
                          {index > 0 ? ", " : null}
                          {String(candidate.value)} ({formatConfidence(candidate.confidence)})
                        </span>
                      ))}
                      .
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Provider metadata and processing trace">
            {trace.length === 0 ? (
              <p className="text-sm text-ink-muted">This artifact has not been processed yet.</p>
            ) : (
              <>
                <dl className="text-sm">
                  {providerEntry !== null ? (
                    <>
                      <dt className="text-ink-muted">Extractor</dt>
                      <dd className="text-ink">
                        {providerEntry.id}@{providerEntry.version}
                      </dd>
                    </>
                  ) : null}
                  <dt className="mt-2 text-ink-muted">Processing duration</dt>
                  <dd className="text-ink">{durationMs === null ? "—" : `${durationMs}ms`}</dd>
                </dl>
                <ol className="mt-3 flex flex-col gap-2 border-t border-border pt-3 text-sm">
                  {trace.map((entry) => (
                    <li key={entry.id}>
                      <p className="font-medium text-ink">
                        {entry.action} <span className="font-normal text-ink-muted">— {entry.actor.type}:{entry.actor.id}</span>
                      </p>
                      <p className="text-xs text-ink-muted">{new Date(entry.occurredAt).toLocaleString()} — {entry.cause}</p>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </SectionCard>

          <SectionCard title="Structured payload">
            <CopyableJson value={{ artifact, segments, observations }} />
          </SectionCard>
        </>
      )}
    </WorkspaceShell>
  );
}
