import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  ObservationSchemaDefinitionSchema,
  type ObservationSchemaDefinition,
} from "@oiw/contracts";
import { describe, expect, it } from "vitest";

import {
  getObservationSchema,
  loadPackFromDirectory,
  validateObservationValue,
} from "../src/index.js";

const fixturesRoot = resolve(import.meta.dirname, "fixtures/packs");
const repositoryRoot = resolve(import.meta.dirname, "../../..");

function definition(
  valueType: "string" | "number" | "boolean" | "object",
  jsonSchema: unknown,
  confidenceThreshold?: number,
): ObservationSchemaDefinition {
  return ObservationSchemaDefinitionSchema.parse({
    schemaKey: "example-value",
    displayName: "Example value",
    description: "A neutral value used to exercise validation.",
    valueType,
    jsonSchema,
    ...(confidenceThreshold === undefined ? {} : { confidenceThreshold }),
  });
}

describe("observation schema catalogue", () => {
  it("loads a typed catalogue for the SDK test pack", async () => {
    const result = await loadPackFromDirectory(resolve(fixturesRoot, "valid"));
    expect(result.status).toBe("loaded");
    if (result.status !== "loaded") {
      throw new Error("expected pack to load");
    }

    expect([...result.pack.observationSchemas.keys()]).toEqual(["record-id"]);
    expect(getObservationSchema(result.pack, "record-id")).toMatchObject({
      displayName: "Record identifier",
      entityType: "record",
      evidenceRequired: true,
      valueType: "string",
      jsonSchema: { type: "string" },
    });
    expect(getObservationSchema(result.pack, "not-declared")).toBeUndefined();
  });

  it("loads every real Asset Reliability observation definition", async () => {
    const packDirectory = resolve(repositoryRoot, "scenario-packs/asset-reliability");
    const result = await loadPackFromDirectory(packDirectory);
    expect(result.status).toBe("loaded");
    if (result.status !== "loaded") {
      throw new Error(JSON.stringify(result.errors));
    }

    expect(result.pack.observationSchemas.size).toBe(result.pack.manifest.observationSchemas.length);
    expect(getObservationSchema(result.pack, "sensor-reading")).toMatchObject({
      entityType: "asset",
      valueType: "object",
      evidenceRequired: true,
      jsonSchema: { type: "object", required: ["value", "unit", "status"] },
    });
  });

  it("reports invalid definitions with file and field context", async () => {
    const temporaryPack = await mkdtemp(resolve(tmpdir(), "oiw-observation-schema-"));
    try {
      await cp(resolve(fixturesRoot, "valid"), temporaryPack, { recursive: true });
      await writeFile(
        resolve(temporaryPack, "schemas/observations.json"),
        JSON.stringify({
          schemaKey: "record-id",
          displayName: "Record identifier",
          description: "Invalid because the value and JSON Schema types disagree.",
          valueType: "number",
          jsonSchema: { type: "string" },
        }),
        "utf8",
      );

      const result = await loadPackFromDirectory(temporaryPack);
      expect(result.status).toBe("invalid");
      if (result.status !== "invalid") {
        throw new Error("expected pack to be invalid");
      }
      expect(
        result.errors.some(
          (issue) => issue.path === "./schemas/observations.json#jsonSchema.type",
        ),
      ).toBe(true);
    } finally {
      await rm(temporaryPack, { recursive: true, force: true });
    }
  });
});

describe("validateObservationValue", () => {
  it("validates strings, enums, patterns and dates", () => {
    const enumDefinition = definition("string", {
      type: "string",
      enum: ["open", "closed"],
      pattern: "^[a-z]+$",
    });
    expect(validateObservationValue(enumDefinition, "open")).toEqual({ ok: true, issues: [] });
    expect(validateObservationValue(enumDefinition, "OPEN").ok).toBe(false);
    expect(validateObservationValue(enumDefinition, "pending").ok).toBe(false);

    const dateDefinition = definition("string", { type: "string", format: "date" });
    expect(validateObservationValue(dateDefinition, "2026-08-31").ok).toBe(true);
    expect(validateObservationValue(dateDefinition, "2026-02-30").ok).toBe(false);
  });

  it("validates number and integer bounds", () => {
    const numberDefinition = definition("number", { type: "number", minimum: 0, maximum: 10 });
    expect(validateObservationValue(numberDefinition, 4.5).ok).toBe(true);
    expect(validateObservationValue(numberDefinition, -1).ok).toBe(false);
    expect(validateObservationValue(numberDefinition, Number.NaN).ok).toBe(false);

    const integerDefinition = definition("number", { type: "integer", minimum: 0 });
    expect(validateObservationValue(integerDefinition, 4).ok).toBe(true);
    expect(validateObservationValue(integerDefinition, 4.5).ok).toBe(false);
  });

  it("validates booleans and preserves an optional confidence threshold", () => {
    const booleanDefinition = definition("boolean", { type: "boolean" }, 0.75);
    expect(booleanDefinition.confidenceThreshold).toBe(0.75);
    expect(validateObservationValue(booleanDefinition, true).ok).toBe(true);
    expect(validateObservationValue(booleanDefinition, "true").ok).toBe(false);
  });

  it("validates required object properties and rejects undeclared properties when configured", () => {
    const objectDefinition = definition("object", {
      type: "object",
      properties: {
        amount: { type: "number", minimum: 0 },
        currency: { type: "string", pattern: "^[A-Z]{3}$" },
      },
      required: ["amount", "currency"],
      additionalProperties: false,
    });

    expect(validateObservationValue(objectDefinition, { amount: 10, currency: "USD" }).ok).toBe(true);
    const invalid = validateObservationValue(objectDefinition, { amount: -1, extra: true });
    expect(invalid.ok).toBe(false);
    expect(invalid.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining(["amount", "currency", "extra"]),
    );
  });

  it("rejects null because abstention is represented outside the value schema", () => {
    expect(validateObservationValue(definition("string", { type: "string" }), null).ok).toBe(false);
  });
});
