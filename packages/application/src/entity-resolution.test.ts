import type {
  AuditEntry,
  Entity,
  Observation,
  ObservationSchemaDefinition,
} from "@oiw/contracts";
import { describe, expect, it } from "vitest";

import { EntityResolutionService } from "./entity-resolution.js";

const workspaceId = "10000000-0000-4000-8000-000000000001";

function entity(
  id: string,
  displayName: string,
  externalReference: string,
  aliases: string[],
  attributeAliases: string[] = [],
): Entity {
  return {
    id,
    workspaceId,
    entityType: "asset",
    displayName,
    externalReference,
    aliases,
    attributes: { aliases: attributeAliases },
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function observation(index: number, value: string): Observation {
  return {
    id: `20000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
    artifactId: "30000000-0000-4000-8000-000000000001",
    entityId: null,
    schemaKey: "entity-reference",
    value,
    normalisedValue: value,
    derivation: "human",
    evidenceStatus: "supported",
    evidenceSegmentId: "40000000-0000-4000-8000-000000000001",
    confidence: 1,
    extractor: null,
    insufficiencyReason: null,
    reviewStatus: "accepted",
    reviewedBy: "reviewer",
    reviewedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("EntityResolutionService", () => {
  it("matches exact references, display names and both alias sources", async () => {
    const entities = [
      entity(
        "50000000-0000-4000-8000-000000000001",
        "Asset Alpha",
        "REF-1",
        ["Alias One"],
        ["Attribute One"],
      ),
      entity(
        "50000000-0000-4000-8000-000000000002",
        "Asset Beta",
        "REF-2",
        ["Shared Alias"],
      ),
      entity(
        "50000000-0000-4000-8000-000000000003",
        "Asset Gamma",
        "REF-3",
        ["Shared Alias"],
      ),
    ];
    const audits: AuditEntry[] = [];
    const stored = new Map<string, Observation>();
    const service = new EntityResolutionService(
      {
        entities: { list: async () => entities },
        observations: {
          correct: async (_workspaceId, observationId, value, audit) => {
            stored.set(observationId, value);
            audits.push(audit);
            return value;
          },
        },
        auditEntries: {
          list: async () => audits,
          insert: async (_workspaceId, value) => {
            audits.push(value);
            return value;
          },
        },
      },
      () => new Date("2026-01-01T00:00:00.000Z"),
    );
    const catalogue = new Map<string, ObservationSchemaDefinition>([
      [
        "entity-reference",
        {
          schemaKey: "entity-reference",
          displayName: "Entity reference",
          description: "Reference used for exact matching",
          entityType: "asset",
          evidenceRequired: true,
          valueType: "string",
          jsonSchema: { type: "string" },
        },
      ],
    ]);
    const inputs = [
      observation(1, "ref-1"),
      observation(2, "Asset Alpha"),
      observation(3, "Alias One"),
      observation(4, "Attribute One"),
      observation(5, "Shared Alias"),
    ];
    const result = await service.resolve(workspaceId, inputs, catalogue);

    for (const input of inputs.slice(0, 4)) {
      expect(stored.get(input.id)?.entityId).toBe(entities[0]!.id);
    }
    const conflict = result.observations.find(({ id }) => id === inputs[4]!.id)!;
    expect(conflict).toMatchObject({ entityId: null, reviewStatus: "conflicting" });
    expect(conflict.alternativeCandidates?.map(({ value }) => value)).toEqual(["REF-2", "REF-3"]);
    expect(result.conflictingObservationIds).toEqual([inputs[4]!.id]);
  });
});
