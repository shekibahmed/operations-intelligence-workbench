import type { EventDefinition } from "@oiw/contracts";
import { describe, expect, it } from "vitest";

import { validateEventDefinitionAmbiguity } from "./events.js";

function definition(
  eventType: string,
  overrides: Partial<EventDefinition> = {},
): EventDefinition {
  return {
    eventType,
    displayName: eventType,
    description: `Definition for ${eventType}`,
    requiredObservations: ["record-id", "review-status"],
    optionalObservations: [],
    occurredAt: {
      observationSchemaKey: null,
      fallback: "artifact-received-at",
    },
    primaryEntity: { observationSchemaKey: "record-id" },
    ...overrides,
  };
}

describe("validateEventDefinitionAmbiguity", () => {
  it("rejects definitions with the same matching criteria regardless of key order", () => {
    const issues = validateEventDefinitionAmbiguity([
      { definition: definition("record-reviewed"), path: "record-reviewed.json" },
      {
        definition: definition("record-approved", {
          requiredObservations: ["review-status", "record-id"],
        }),
        path: "record-approved.json",
      },
    ]);

    expect(issues).toEqual([
      expect.objectContaining({
        path: "record-approved.json#requiredObservations",
        message: expect.stringContaining('indistinguishable from "record-reviewed"'),
      }),
    ]);
  });

  it("accepts honest key distinctions and disjoint required value constraints", () => {
    const issues = validateEventDefinitionAmbiguity([
      {
        definition: definition("record-reviewed", {
          requiredObservationValues: { "review-status": ["resolved", "unresolved"] },
        }),
        path: "record-reviewed.json",
      },
      {
        definition: definition("record-rejected", {
          requiredObservationValues: { "review-status": ["not-accepted"] },
        }),
        path: "record-rejected.json",
      },
      {
        definition: definition("record-filed", {
          requiredObservations: ["record-id", "filed-at"],
          primaryEntity: { observationSchemaKey: "record-id" },
        }),
        path: "record-filed.json",
      },
    ]);

    expect(issues).toEqual([]);
  });
});
