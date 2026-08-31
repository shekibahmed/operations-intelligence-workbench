import type { ActionItem, Approval, ArtifactSegment, Case, Decision, OperationalEvent, Signal } from "@oiw/contracts";

import {
  actionItemsForCase,
  approvalsForDecision,
  decisionsForCase,
  eventsForEntity,
  findCaseById,
  findEntityById,
  findSegmentById,
  stubObservations,
  stubSignals,
} from "@/lib/stub";

export const CLOSURE_REQUIREMENT_LABEL: Record<string, string> = {
  "inspection-completed": "Inspection completed",
  "decision-approved": "Decision approved",
  "observation-reviewed": "All observations reviewed",
};

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

export function buildCaseDetailView(caseId: string): CaseDetailView | undefined {
  const caseRecord = findCaseById(caseId);
  if (!caseRecord) return undefined;

  const relatedEntities = caseRecord.relatedEntityIds
    .map((id) => {
      const entity = findEntityById(id);
      return entity ? { id: entity.id, name: entity.displayName } : null;
    })
    .filter((entry): entry is { id: string; name: string } => entry !== null);

  const signals = stubSignals.filter((signal) => caseRecord.relatedSignalIds.includes(signal.id));
  const evidenceIds = new Set<string>([
    ...signals.flatMap((signal) => signal.evidenceSegmentIds),
  ]);
  const evidence = [...evidenceIds]
    .map((id) => findSegmentById(id))
    .filter((segment): segment is ArtifactSegment => segment !== undefined);

  const timeline = relatedEntities
    .flatMap((entity) => eventsForEntity(entity.id))
    .filter((event, index, all) => all.findIndex((candidate) => candidate.id === event.id) === index)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  const actionItems = actionItemsForCase(caseId);
  const decisions = decisionsForCase(caseId);
  const approvals = decisions.flatMap((decision) => approvalsForDecision(decision.id));

  const hasInspectionEvent = timeline.some((event) => event.eventType === "inspection-completed");
  const allDecisionsApproved = decisions.length > 0 && decisions.every((decision) => decision.status === "approved");
  const caseObservationIds = new Set(timeline.flatMap((event) => event.observationIds));
  const allObservationsReviewed = ![...caseObservationIds]
    .map((id) => stubObservations.find((observation) => observation.id === id))
    .some((observation) => observation?.reviewStatus === "pending");

  const requirementComplete: Record<string, boolean> = {
    "inspection-completed": hasInspectionEvent,
    "decision-approved": allDecisionsApproved,
    "observation-reviewed": allObservationsReviewed,
  };

  const closureRequirements = caseRecord.closureRequirementIds.map((id) => ({
    id,
    label: CLOSURE_REQUIREMENT_LABEL[id] ?? id,
    complete: requirementComplete[id] ?? false,
  }));

  return {
    caseRecord,
    relatedEntities,
    evidence,
    timeline,
    signals,
    actionItems,
    decisions,
    approvals,
    closureRequirements,
  };
}
