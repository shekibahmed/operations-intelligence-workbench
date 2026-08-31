import type { Artifact, Case, Entity, OperationalEvent, Signal } from "@oiw/contracts";
import type { PersistenceRepositories } from "@oiw/persistence";

export interface EntityDetailView {
  entity: Entity;
  relatedArtifacts: Artifact[];
  events: OperationalEvent[];
  openCases: Case[];
  closedCases: Case[];
  patternSignals: Signal[];
  relatedEntities: Entity[];
}

/** Builds the Entity Detail view (UX_SPEC §5.10 / PRD §20.6) from real, workspace-scoped persistence data. */
export async function buildEntityDetailView(
  repositories: PersistenceRepositories,
  workspaceId: string,
  entityId: string,
): Promise<EntityDetailView | null> {
  const entity = await repositories.entities.findById(workspaceId, entityId);
  if (entity === null) return null;

  const [observations, events, cases, signals, entities] = await Promise.all([
    repositories.observations.list(workspaceId),
    repositories.operationalEvents.list(workspaceId),
    repositories.cases.list(workspaceId),
    repositories.signals.list(workspaceId),
    repositories.entities.list(workspaceId),
  ]);

  const relatedArtifactIds = new Set(
    observations.filter((observation) => observation.entityId === entityId).map((observation) => observation.artifactId),
  );
  const relatedArtifacts = (
    await Promise.all([...relatedArtifactIds].map((id) => repositories.artifacts.findById(workspaceId, id)))
  ).filter((artifact): artifact is Artifact => artifact !== null);

  const entityEvents = events
    .filter((event) => event.entityIds.includes(entityId))
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
  const entityEventIds = new Set(entityEvents.map((event) => event.id));

  const relatedCases = cases.filter((caseRecord) => caseRecord.relatedEntityIds.includes(entityId));
  const openCases = relatedCases.filter((caseRecord) => caseRecord.status !== "closed");
  const closedCases = relatedCases.filter((caseRecord) => caseRecord.status === "closed");

  const patternSignals = signals.filter(
    (signal) => signal.eventIds.some((eventId) => entityEventIds.has(eventId)) && signal.eventIds.length > 1,
  );

  const relatedEntities = entities.filter(
    (candidate) =>
      candidate.id !== entityId && events.some((event) => event.entityIds.includes(entityId) && event.entityIds.includes(candidate.id)),
  );

  return {
    entity,
    relatedArtifacts,
    events: entityEvents,
    openCases,
    closedCases,
    patternSignals,
    relatedEntities,
  };
}
