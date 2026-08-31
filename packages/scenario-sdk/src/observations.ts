import type { ObservationSchemaDefinition } from "@oiw/contracts";

import type { LoadedScenarioPack } from "./loader.js";

export interface ObservationValueValidationIssue {
  path: (string | number)[];
  message: string;
}

export interface ObservationValueValidationResult {
  ok: boolean;
  issues: ObservationValueValidationIssue[];
}

type SupportedJsonSchema = ObservationSchemaDefinition["jsonSchema"];

function addIssue(
  issues: ObservationValueValidationIssue[],
  path: (string | number)[],
  message: string,
): void {
  issues.push({ path, message });
}

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateAgainstSchema(
  schema: SupportedJsonSchema,
  value: unknown,
  path: (string | number)[],
  issues: ObservationValueValidationIssue[],
): void {
  if (schema.type === "string") {
    if (typeof value !== "string") {
      addIssue(issues, path, "Expected a string");
      return;
    }
    if (schema.enum !== undefined && !schema.enum.includes(value)) {
      addIssue(issues, path, `Expected one of: ${schema.enum.join(", ")}`);
    }
    if (schema.format === "date" && !isCalendarDate(value)) {
      addIssue(issues, path, "Expected an ISO 8601 calendar date (YYYY-MM-DD)");
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, "u").test(value)) {
      addIssue(issues, path, `Expected a string matching ${schema.pattern}`);
    }
    return;
  }

  if (schema.type === "number" || schema.type === "integer") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      addIssue(issues, path, `Expected a finite ${schema.type}`);
      return;
    }
    if (schema.type === "integer" && !Number.isInteger(value)) {
      addIssue(issues, path, "Expected an integer");
    }
    if (schema.minimum !== undefined && value < schema.minimum) {
      addIssue(issues, path, `Expected a value greater than or equal to ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      addIssue(issues, path, `Expected a value less than or equal to ${schema.maximum}`);
    }
    return;
  }

  if (schema.type === "boolean") {
    if (typeof value !== "boolean") {
      addIssue(issues, path, "Expected a boolean");
    }
    return;
  }

  if (schema.type !== "object") {
    addIssue(issues, path, "Unsupported observation value schema");
    return;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    addIssue(issues, path, "Expected an object");
    return;
  }

  const record = value as Record<string, unknown>;
  for (const requiredProperty of schema.required ?? []) {
    if (!(requiredProperty in record)) {
      addIssue(issues, [...path, requiredProperty], "Required property is missing");
    }
  }
  for (const [property, propertyValue] of Object.entries(record)) {
    const propertySchema = schema.properties[property];
    if (propertySchema !== undefined) {
      validateAgainstSchema(propertySchema, propertyValue, [...path, property], issues);
    } else if (schema.additionalProperties === false) {
      addIssue(issues, [...path, property], "Additional properties are not allowed");
    }
  }
}

/** Validates one proposed value against a loaded observation definition. */
export function validateObservationValue(
  definition: ObservationSchemaDefinition,
  value: unknown,
): ObservationValueValidationResult {
  const issues: ObservationValueValidationIssue[] = [];
  validateAgainstSchema(definition.jsonSchema, value, [], issues);
  return { ok: issues.length === 0, issues };
}

/** Looks up a schema definition from a loaded pack's validated catalogue. */
export function getObservationSchema(
  pack: LoadedScenarioPack,
  schemaKey: string,
): ObservationSchemaDefinition | undefined {
  return pack.observationSchemas.get(schemaKey);
}
