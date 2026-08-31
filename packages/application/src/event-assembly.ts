import type {
  Artifact,
  AuditEntry,
  EventDefinition,
  JsonValue,
  Observation,
  OperationalEvent,
} from "@oiw/contracts";

import { deterministicUuid, stableJson } from "./records.js";
import {
  appendOperationalAuditOnce,
  type OperationalAuditRepository,
} from "./operational-audit.js";

interface EventAssemblyRepositories {
  operationalEvents: {
    insert(workspaceId: string, value: OperationalEvent): Promise<OperationalEvent>;
    findById(workspaceId: string, eventId: string): Promise<OperationalEvent | null>;
    list(workspaceId: string): Promise<OperationalEvent[]>;
  };
  auditEntries: OperationalAuditRepository;
}

export interface EventAssemblyResult {
  event: OperationalEvent | null;
  idempotent: boolean;
  duplicateSuppressed: boolean;
}

const composableStatuses = new Set<Observation["reviewStatus"]>([
  "not-required",
  "accepted",
  "corrected",
]);

function eventTime(value: JsonValue | null, fallback: string): string {
  if (typeof value !== "string") return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/u.test(value)) return `${value}T00:00:00.000Z`;
  if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) return fallback;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallback : new Date(parsed).toISOString();
}

function selectedValue(observation: Observation): JsonValue | null {
  return observation.normalisedValue ?? observation.value;
}

function satisfiesRequiredObservationValues(
  definition: EventDefinition,
  observations: readonly Observation[],
): boolean {
  return Object.entries(definition.requiredObservationValues ?? {}).every(
    ([schemaKey, acceptedValues]) => {
      const constrained = observations.filter(
        (observation) => observation.schemaKey === schemaKey,
      );
      return (
        constrained.length > 0 &&
        constrained.every((observation) =>
          acceptedValues.some(
            (acceptedValue) =>
              stableJson(selectedValue(observation)) === stableJson(acceptedValue),
          ),
        )
      );
    },
  );
}

function attributesFor(
  definition: EventDefinition,
  observations: readonly Observation[],
): Record<string, JsonValue> {
  const attributes: Record<string, JsonValue> = {};
  for (const schemaKey of [
    ...definition.requiredObservations,
    ...definition.optionalObservations,
  ]) {
    const values = observations
      .filter((observation) => observation.schemaKey === schemaKey)
      .map(selectedValue);
    if (values.length === 1) attributes[schemaKey] = values[0]!;
    if (values.length > 1) attributes[schemaKey] = values;
  }
  return attributes;
}

function matchingDefinition(
  definitions: ReadonlyMap<string, EventDefinition>,
  observations: readonly Observation[],
): { definition: EventDefinition; observations: Observation[] } | null {
  const eligible = observations.filter((observation) => composableStatuses.has(observation.reviewStatus));
  for (const definition of definitions.values()) {
    if (
      !definition.requiredObservations.every((schemaKey) =>
        eligible.some((observation) => observation.schemaKey === schemaKey),
      )
    ) {
      continue;
    }
    if (!satisfiesRequiredObservationValues(definition, eligible)) continue;
    const composedKeys = new Set([
      ...definition.requiredObservations,
      ...definition.optionalObservations,
    ]);
    const composed = eligible.filter((observation) => composedKeys.has(observation.schemaKey));
    const primaryKey = definition.primaryEntity?.observationSchemaKey;
    if (
      primaryKey !== undefined &&
      definition.requiredObservations.includes(primaryKey) &&
      !composed.some(
        (observation) => observation.schemaKey === primaryKey && observation.entityId !== null,
      )
    ) {
      continue;
    }
    return { definition, observations: composed };
  }
  return null;
}

export class EventAssemblyService {
  constructor(
    private readonly repositories: EventAssemblyRepositories,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async assemble(
    workspaceId: string,
    artifact: Artifact,
    observations: readonly Observation[],
    definitions: ReadonlyMap<string, EventDefinition>,
  ): Promise<EventAssemblyResult> {
    const observationIds = new Set(observations.map(({ id }) => id));
    const existing = (await this.repositories.operationalEvents.list(workspaceId)).find((event) =>
      event.observationIds.some((observationId) => observationIds.has(observationId)),
    );
    if (existing !== undefined) {
      const duplicateDetected = (await this.repositories.auditEntries.list(workspaceId)).some(
        (entry: AuditEntry) =>
          entry.action === "artifact-duplicate-detected" && entry.subject.id === artifact.id,
      );
      if (duplicateDetected) {
        await appendOperationalAuditOnce(this.repositories.auditEntries, {
          workspaceId,
          occurredAt: this.clock().toISOString(),
          action: "duplicate-event-suppressed",
          actorId: "event-assembler",
          subject: { type: "artifact", id: artifact.id },
          cause: "An exact duplicate Artifact resolved to an already assembled Event",
          data: { eventId: existing.id, checksum: artifact.checksum },
          idempotencyKey: `duplicate-event:${artifact.id}:${existing.id}`,
        });
      }
      return { event: existing, idempotent: true, duplicateSuppressed: duplicateDetected };
    }

    const match = matchingDefinition(definitions, observations);
    if (match === null) {
      await appendOperationalAuditOnce(this.repositories.auditEntries, {
        workspaceId,
        occurredAt: this.clock().toISOString(),
        action: "event-assembly-deferred",
        actorId: "event-assembler",
        subject: { type: "artifact", id: artifact.id },
        cause:
          "No Event definition satisfied required reviewed Observations, value constraints and primary Entity resolution",
        data: { observationIds: observations.map(({ id }) => id) },
        idempotencyKey: `event-deferred:${artifact.id}:${observations.map(({ id, reviewStatus, entityId }) => `${id}:${reviewStatus}:${entityId ?? "none"}`).join("|")}`,
      });
      return { event: null, idempotent: false, duplicateSuppressed: false };
    }

    const eventId = deterministicUuid(
      workspaceId,
      `event:${artifact.id}:${match.definition.eventType}`,
    );
    const byId = await this.repositories.operationalEvents.findById(workspaceId, eventId);
    if (byId !== null) return { event: byId, idempotent: true, duplicateSuppressed: false };

    const occurredAtKey = match.definition.occurredAt.observationSchemaKey;
    const occurredAtObservation =
      occurredAtKey === null
        ? undefined
        : match.observations.find((observation) => observation.schemaKey === occurredAtKey);
    const primaryKey = match.definition.primaryEntity?.observationSchemaKey;
    const primaryEntityId =
      primaryKey === undefined
        ? null
        : (match.observations.find((observation) => observation.schemaKey === primaryKey)?.entityId ??
          null);
    const event: OperationalEvent = {
      id: eventId,
      workspaceId,
      eventType: match.definition.eventType,
      occurredAt: eventTime(
        occurredAtObservation === undefined ? null : selectedValue(occurredAtObservation),
        artifact.receivedAt,
      ),
      recordedAt: this.clock().toISOString(),
      entityIds: primaryEntityId === null ? [] : [primaryEntityId],
      observationIds: match.observations.map(({ id }) => id),
      attributes: attributesFor(match.definition, match.observations),
      assembly: { assemblerId: "event-assembler", assemblerVersion: "1.0.0" },
      reEvaluationStatus: "current",
    };
    const inserted = await this.repositories.operationalEvents.insert(workspaceId, event);
    await appendOperationalAuditOnce(this.repositories.auditEntries, {
      workspaceId,
      occurredAt: this.clock().toISOString(),
      action: "event-assembled",
      actorId: "event-assembler",
      subject: { type: "operational-event", id: inserted.id },
      cause: "Reviewed Observations satisfied a validated Event definition",
      data: {
        artifactId: artifact.id,
        eventType: inserted.eventType,
        observationIds: inserted.observationIds,
        entityIds: inserted.entityIds,
      },
      idempotencyKey: `event-assembled:${inserted.id}`,
    });
    return { event: inserted, idempotent: false, duplicateSuppressed: false };
  }
}
