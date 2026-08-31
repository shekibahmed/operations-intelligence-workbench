import type {
  ActionItem,
  Approval,
  ArtifactSegment,
  Case,
  Decision,
  OperationalEvent,
  Signal,
} from "@oiw/contracts";
import type { PersistenceRepositories } from "@oiw/persistence";

export interface CaseDetailView {
  caseRecord: Case;
  relatedEntities: { id: string; name: string }[];
  evidence: ArtifactSegment[];
  timeline: OperationalEvent[];
  signals: Signal[];
  actionItems: ActionItem[];
  decisions: Decision[];
  approvals: Approval[];
  closureRequirements: { id: string; label: string; complete: boolean }[];
}

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function intersects(left: readonly string[], right: readonly string[]): boolean {
  const values = new Set(left);
  return right.some((value) => values.has(value));
}

/**
 * Whether a Case's closure requirement (a pack-defined free-text slug, PRD
 * §9.10 — there is no contract linking a requirement ID to how it is
 * satisfied) appears met, using two generic, pack-neutral heuristics rather
 * than hardcoding any pack's requirement vocabulary: a requirement named
 * after an Event type is satisfied once that Event type appears in this
 * Case's timeline; a requirement that mentions "decision" is satisfied once
 * every Decision on this Case has reached a resolved (non-pending) status.
 * Anything else defaults to unsatisfied rather than guessing.
 */
function isRequirementComplete(
  requirementId: string,
  timeline: readonly OperationalEvent[],
  decisions: readonly Decision[],
): boolean {
  if (timeline.some((event) => event.eventType === requirementId)) return true;
  if (requirementId.includes("decision")) {
    return decisions.length > 0 && decisions.every((decision) => decision.status === "approved" || decision.status === "rejected");
  }
  return false;
}

/** Builds the Case Detail view (UX_SPEC §5.8 / PRD §20.5) from real, workspace-scoped persistence data. */
export async function buildCaseDetailView(
  repositories: PersistenceRepositories,
  workspaceId: string,
  caseId: string,
): Promise<CaseDetailView | null> {
  const caseRecord = await repositories.cases.findById(workspaceId, caseId);
  if (caseRecord === null) return null;

  const [entities, events, signals, actionItems, decisions, approvals] = await Promise.all([
    repositories.entities.list(workspaceId),
    repositories.operationalEvents.list(workspaceId),
    repositories.signals.list(workspaceId),
    repositories.actionItems.list(workspaceId),
    repositories.decisions.list(workspaceId),
    repositories.approvals.list(workspaceId),
  ]);

  const relatedEntities = caseRecord.relatedEntityIds
    .map((id) => entities.find((entity) => entity.id === id))
    .filter((entity): entity is NonNullable<typeof entity> => entity !== undefined)
    .map((entity) => ({ id: entity.id, name: entity.displayName }));

  const timeline = events
    .filter((event) => caseRecord.relatedEventIds.includes(event.id) || intersects(caseRecord.relatedEntityIds, event.entityIds))
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));

  const caseSignals = signals.filter((signal) => caseRecord.relatedSignalIds.includes(signal.id));
  const caseActionItems = actionItems.filter((item) => item.caseId === caseId);
  const caseDecisions = decisions.filter((decision) => decision.caseId === caseId);
  const decisionIds = new Set(caseDecisions.map((decision) => decision.id));
  const caseApprovals = approvals.filter((approval) => decisionIds.has(approval.decisionId));

  const evidenceSegmentIds = [
    ...new Set([
      ...caseSignals.flatMap((signal) => signal.evidenceSegmentIds),
      ...caseDecisions.flatMap((decision) => decision.evidenceSegmentIds),
    ]),
  ];
  const evidence = (
    await Promise.all(evidenceSegmentIds.map((id) => repositories.artifactSegments.findById(workspaceId, id)))
  ).filter((segment): segment is ArtifactSegment => segment !== null);

  const closureRequirements = caseRecord.closureRequirementIds.map((id) => ({
    id,
    label: humanizeSlug(id),
    complete: isRequirementComplete(id, timeline, caseDecisions),
  }));

  return {
    caseRecord,
    relatedEntities,
    evidence,
    timeline,
    signals: caseSignals,
    actionItems: caseActionItems,
    decisions: caseDecisions,
    approvals: caseApprovals,
    closureRequirements,
  };
}
