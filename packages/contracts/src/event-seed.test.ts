import { describe, expect, it } from "vitest";

import {
  EventDefinitionSchema,
  SeedEntityCatalogueSchema,
  SeedEntitySchema,
} from "./configuration.js";

const eventDefinition = {
  eventType: "record-received",
  displayName: "Record received",
  description: "A neutral operational record was received.",
  requiredObservations: ["record-id"],
  optionalObservations: ["recorded-date"],
  occurredAt: {
    observationSchemaKey: "recorded-date",
    fallback: "artifact-received-at",
  },
  primaryEntity: { observationSchemaKey: "record-id" },
} as const;

describe("EventDefinition contract v1.4", () => {
  it("accepts explicit composition, time fallback and Entity mapping", () => {
    expect(EventDefinitionSchema.parse(eventDefinition)).toEqual(eventDefinition);
  });

  it("accepts an explicit artifact-time fallback with no Entity mapping", () => {
    expect(
      EventDefinitionSchema.safeParse({
        ...eventDefinition,
        optionalObservations: [],
        occurredAt: { observationSchemaKey: null, fallback: "artifact-received-at" },
        primaryEntity: null,
      }).success,
    ).toBe(true);
  });

  it("accepts value constraints on required observations", () => {
    expect(
      EventDefinitionSchema.parse({
        ...eventDefinition,
        requiredObservationValues: { "record-id": ["REC-123", "REC-124"] },
      }).requiredObservationValues,
    ).toEqual({ "record-id": ["REC-123", "REC-124"] });
  });

  it("rejects value constraints on observations that are not required", () => {
    const result = EventDefinitionSchema.safeParse({
      ...eventDefinition,
      requiredObservationValues: { "recorded-date": ["2026-01-01"] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual([
        "requiredObservationValues",
        "recorded-date",
      ]);
    }
  });

  it("rejects duplicate, overlapping and uncomposed mapping keys", () => {
    const result = EventDefinitionSchema.safeParse({
      ...eventDefinition,
      requiredObservations: ["record-id", "record-id"],
      optionalObservations: ["record-id"],
      occurredAt: { observationSchemaKey: "missing-date", fallback: "artifact-received-at" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining([
          "requiredObservations",
          "optionalObservations.0",
          "occurredAt.observationSchemaKey",
        ]),
      );
    }
  });
});

describe("SeedEntity contract v1.3", () => {
  const seedEntity = {
    id: "record-r-142",
    entityType: "record",
    displayName: "Record R-142",
    externalReference: "R-142",
    aliases: ["R142", "Record 142"],
    attributes: { synthetic: true, category: "example" },
    status: "active",
  } as const;

  it("accepts stable synthetic Entity definitions", () => {
    expect(SeedEntitySchema.parse(seedEntity)).toEqual(seedEntity);
    expect(SeedEntityCatalogueSchema.parse([seedEntity])).toEqual([seedEntity]);
  });

  it("defaults aliases and rejects duplicate aliases", () => {
    expect(SeedEntitySchema.parse({ ...seedEntity, aliases: undefined }).aliases).toEqual([]);
    const result = SeedEntitySchema.safeParse({ ...seedEntity, aliases: ["R142", "R142"] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["aliases"]);
  });

  it("rejects unstable identifiers and non-JSON attributes", () => {
    expect(SeedEntitySchema.safeParse({ ...seedEntity, id: "Record 142" }).success).toBe(false);
    expect(
      SeedEntitySchema.safeParse({ ...seedEntity, attributes: { invalid: Number.NaN } }).success,
    ).toBe(false);
  });
});
