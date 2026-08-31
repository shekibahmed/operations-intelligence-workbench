import type {
  Entity,
  JsonValue,
  Observation,
  ObservationSchemaDefinition,
} from "@oiw/contracts";

import {
  prepareOperationalAudit,
  type OperationalAuditRepository,
} from "./operational-audit.js";

interface EntityResolutionRepositories {
  entities: { list(workspaceId: string): Promise<Entity[]> };
  observations: {
    correct(
      workspaceId: string,
      observationId: string,
      value: Observation,
      auditEntry: Awaited<ReturnType<typeof prepareOperationalAudit>>,
    ): Promise<Observation | null>;
  };
  auditEntries: OperationalAuditRepository;
}

export interface EntityResolutionResult {
  observations: Observation[];
  matchedObservationIds: string[];
  conflictingObservationIds: string[];
  unmatchedObservationIds: string[];
}

interface CandidateTerm {
  value: string;
  confidence: number;
}

function normaliseExact(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en");
}

function attributeAliases(entity: Entity): string[] {
  const aliases = entity.attributes["aliases"];
  return Array.isArray(aliases)
    ? aliases.filter((value): value is string => typeof value === "string")
    : [];
}

function references(entity: Entity): string[] {
  return [
    entity.displayName,
    ...(entity.externalReference === null ? [] : [entity.externalReference]),
    ...entity.aliases,
    ...attributeAliases(entity),
  ];
}

function candidateTerms(observation: Observation): CandidateTerm[] {
  const values: CandidateTerm[] = [];
  const primary =
    typeof observation.normalisedValue === "string"
      ? observation.normalisedValue
      : typeof observation.value === "string"
        ? observation.value
        : null;
  if (primary !== null) values.push({ value: primary, confidence: observation.confidence ?? 1 });
  for (const candidate of observation.alternativeCandidates ?? []) {
    if (typeof candidate.value === "string") {
      values.push({ value: candidate.value, confidence: candidate.confidence });
    }
  }
  const unique = new Map<string, CandidateTerm>();
  for (const candidate of values) {
    const key = normaliseExact(candidate.value);
    const current = unique.get(key);
    if (current === undefined || candidate.confidence > current.confidence) unique.set(key, candidate);
  }
  return [...unique.values()];
}

function entityMatches(
  observation: Observation,
  entityType: string,
  entities: readonly Entity[],
): Array<{ entity: Entity; confidence: number }> {
  const terms = candidateTerms(observation);
  const matches = new Map<string, { entity: Entity; confidence: number }>();
  for (const entity of entities) {
    if (entity.entityType !== entityType) continue;
    const entityReferences = new Set(references(entity).map(normaliseExact));
    for (const term of terms) {
      if (!entityReferences.has(normaliseExact(term.value))) continue;
      const current = matches.get(entity.id);
      if (current === undefined || term.confidence > current.confidence) {
        matches.set(entity.id, { entity, confidence: term.confidence });
      }
    }
  }
  return [...matches.values()].sort((left, right) => left.entity.id.localeCompare(right.entity.id));
}

function candidateValue(entity: Entity): JsonValue {
  return entity.externalReference ?? entity.displayName;
}

const linkableStatuses = new Set<Observation["reviewStatus"]>([
  "not-required",
  "accepted",
  "corrected",
]);

export class EntityResolutionService {
  constructor(
    private readonly repositories: EntityResolutionRepositories,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async resolve(
    workspaceId: string,
    observations: readonly Observation[],
    catalogue: ReadonlyMap<string, ObservationSchemaDefinition>,
  ): Promise<EntityResolutionResult> {
    const entities = await this.repositories.entities.list(workspaceId);
    const resolved: Observation[] = [];
    const matchedObservationIds: string[] = [];
    const conflictingObservationIds: string[] = [];
    const unmatchedObservationIds: string[] = [];

    for (const observation of observations) {
      const entityType = catalogue.get(observation.schemaKey)?.entityType;
      if (entityType === undefined || observation.reviewStatus === "rejected") {
        resolved.push(observation);
        continue;
      }
      const matches = entityMatches(observation, entityType, entities);
      if (matches.length > 1) {
        const updated: Observation = {
          ...observation,
          entityId: null,
          reviewStatus: "conflicting",
          alternativeCandidates: matches.map(({ entity, confidence }) => ({
            value: candidateValue(entity),
            confidence,
          })),
        };
        if (
          observation.reviewStatus !== "conflicting" ||
          observation.entityId !== null ||
          JSON.stringify(observation.alternativeCandidates) !==
            JSON.stringify(updated.alternativeCandidates)
        ) {
          const audit = await prepareOperationalAudit(this.repositories.auditEntries, {
            workspaceId,
            occurredAt: this.clock().toISOString(),
            action: "entity-resolution-conflicting",
            actorId: "entity-resolution",
            subject: { type: "observation", id: observation.id },
            cause: "More than one exact Entity candidate matched the extracted references",
            data: {
              entityType,
              candidateEntityIds: matches.map(({ entity }) => entity.id),
            },
          });
          resolved.push(
            (await this.repositories.observations.correct(
              workspaceId,
              observation.id,
              updated,
              audit,
            )) ?? updated,
          );
        } else {
          resolved.push(observation);
        }
        conflictingObservationIds.push(observation.id);
        continue;
      }

      if (matches.length === 1 && linkableStatuses.has(observation.reviewStatus)) {
        const match = matches[0]!;
        if (observation.entityId === match.entity.id) {
          resolved.push(observation);
        } else {
          const updated = { ...observation, entityId: match.entity.id };
          const audit = await prepareOperationalAudit(this.repositories.auditEntries, {
            workspaceId,
            occurredAt: this.clock().toISOString(),
            action: "entity-resolution-matched",
            actorId: "entity-resolution",
            subject: { type: "observation", id: observation.id },
            cause: "An exact external reference, display name or alias matched one Entity",
            data: { entityId: match.entity.id, entityType },
          });
          resolved.push(
            (await this.repositories.observations.correct(
              workspaceId,
              observation.id,
              updated,
              audit,
            )) ?? updated,
          );
        }
        matchedObservationIds.push(observation.id);
        continue;
      }

      if (matches.length === 0 && linkableStatuses.has(observation.reviewStatus)) {
        resolved.push(observation);
        unmatchedObservationIds.push(observation.id);
        continue;
      }
      resolved.push(observation);
    }

    return {
      observations: resolved,
      matchedObservationIds,
      conflictingObservationIds,
      unmatchedObservationIds,
    };
  }
}
