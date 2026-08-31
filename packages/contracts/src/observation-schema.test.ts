import { describe, expect, it } from "vitest";

import { ObservationSchemaDefinitionSchema } from "./configuration.js";

const baseDefinition = {
  schemaKey: "record-identifier",
  displayName: "Record identifier",
  description: "The stable identifier stated in the source.",
  entityType: "record",
} as const;

describe("ObservationSchemaDefinition contract v1.2", () => {
  it("accepts the shipped string, enum, date, number, integer, boolean and object shapes", () => {
    const definitions = [
      { ...baseDefinition, valueType: "string", jsonSchema: { type: "string" } },
      {
        ...baseDefinition,
        valueType: "string",
        jsonSchema: { type: "string", enum: ["open", "closed"] },
        confidenceThreshold: 0.8,
      },
      { ...baseDefinition, valueType: "string", jsonSchema: { type: "string", format: "date" } },
      { ...baseDefinition, valueType: "number", jsonSchema: { type: "number", minimum: 0, maximum: 100 } },
      { ...baseDefinition, valueType: "number", jsonSchema: { type: "integer", minimum: 0 } },
      { ...baseDefinition, valueType: "boolean", jsonSchema: { type: "boolean" } },
      {
        ...baseDefinition,
        valueType: "object",
        jsonSchema: {
          type: "object",
          properties: { amount: { type: "number" }, currency: { type: "string" } },
          required: ["amount", "currency"],
          additionalProperties: false,
        },
      },
    ] as const;

    for (const definition of definitions) {
      const result = ObservationSchemaDefinitionSchema.safeParse(definition);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.evidenceRequired).toBe(true);
      }
    }
  });

  it("rejects mismatched value types and invalid constraints with precise paths", () => {
    const mismatched = ObservationSchemaDefinitionSchema.safeParse({
      ...baseDefinition,
      valueType: "number",
      jsonSchema: { type: "string" },
    });
    expect(mismatched.success).toBe(false);

    const invalid = ObservationSchemaDefinitionSchema.safeParse({
      ...baseDefinition,
      valueType: "string",
      jsonSchema: { type: "string", pattern: "[", enum: ["same", "same"] },
      confidenceThreshold: 1.1,
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining([
          "jsonSchema.pattern",
          "jsonSchema.enum",
          "confidenceThreshold",
        ]),
      );
    }
  });

  it("rejects object required keys that are not declared properties", () => {
    const result = ObservationSchemaDefinitionSchema.safeParse({
      ...baseDefinition,
      valueType: "object",
      jsonSchema: {
        type: "object",
        properties: { amount: { type: "number" } },
        required: ["currency"],
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["jsonSchema", "required", 0]);
    }
  });
});
