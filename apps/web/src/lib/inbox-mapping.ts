import type { Artifact, Observation, Source } from "@oiw/contracts";

import type { InboxRow } from "@/app/w/[workspace]/inbox/InboxTable";

/** UX_SPEC §5.5 NFR: paginate/cap large fixture sets — the demo pack ships well under this cap. */
export const INBOX_ROW_CAP = 200;

const REVIEW_REQUIRED_STATUSES: ReadonlySet<Observation["reviewStatus"]> = new Set(["pending", "conflicting"]);

/**
 * Maps real persisted Artifacts/Sources/Observations onto Inbox table rows.
 * Observation/review-required columns are real once an artifact has been
 * processed (OIW-301/OIW-406); an unprocessed artifact still shows a real
 * empty count, not a fabricated one. Linked entity and related case stay
 * null — entity resolution and case assembly are non-goals of this task.
 */
export function mapArtifactsToInboxRows(
  artifacts: Artifact[],
  sources: Source[],
  observations: Observation[],
  base: string,
  rowCap: number = INBOX_ROW_CAP,
): InboxRow[] {
  const sourcesById = new Map<string, Source>(sources.map((source) => [source.id, source]));
  const observationsByArtifact = new Map<string, Observation[]>();
  for (const observation of observations) {
    const existing = observationsByArtifact.get(observation.artifactId);
    if (existing === undefined) observationsByArtifact.set(observation.artifactId, [observation]);
    else existing.push(observation);
  }

  return artifacts.slice(0, rowCap).map((artifact) => {
    const artifactObservations = observationsByArtifact.get(artifact.id) ?? [];
    return {
      artifact,
      sourceName: sourcesById.get(artifact.sourceId)?.name ?? artifact.sourceId,
      linkedEntity: null,
      observationsFound: artifactObservations.length,
      reviewRequired: artifactObservations.some((observation) => REVIEW_REQUIRED_STATUSES.has(observation.reviewStatus)),
      relatedCaseTitle: null,
      technicalHref: `${base}/technical/artifacts/${artifact.id}`,
    };
  });
}
