import type { Artifact, Source } from "@oiw/contracts";

import type { InboxRow } from "@/app/w/[workspace]/inbox/InboxTable";

/** UX_SPEC §5.5 NFR: paginate/cap large fixture sets — the demo pack ships well under this cap. */
export const INBOX_ROW_CAP = 200;

/**
 * Maps real persisted Artifacts/Sources onto Inbox table rows. Linked
 * entity, observation and review-required columns stay empty until artifact
 * processing (OIW-301) exists to populate them — real absence of data, not
 * a stub value.
 */
export function mapArtifactsToInboxRows(
  artifacts: Artifact[],
  sources: Source[],
  base: string,
  rowCap: number = INBOX_ROW_CAP,
): InboxRow[] {
  const sourcesById = new Map<string, Source>(sources.map((source) => [source.id, source]));
  return artifacts.slice(0, rowCap).map((artifact) => ({
    artifact,
    sourceName: sourcesById.get(artifact.sourceId)?.name ?? artifact.sourceId,
    linkedEntity: null,
    observationsFound: 0,
    reviewRequired: false,
    relatedCaseTitle: null,
    technicalHref: `${base}/technical/artifacts/${artifact.id}`,
  }));
}
