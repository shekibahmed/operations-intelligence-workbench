import type { Observation, OperationalEvent, RuleDefinition } from "@oiw/contracts";
import { describe, expect, it } from "vitest";

import { RuleEngine, evaluateCondition, resolveFact } from "./engine.js";

const workspaceId = "10000000-0000-4000-8000-000000000001";
const entityId = "20000000-0000-4000-8000-000000000001";

function event(
  id: string,
  eventType: string,
  occurredAt: string,
  entityIds: string[] = [entityId],
): OperationalEvent {
  return {
    id,
    workspaceId,
    eventType,
    occurredAt,
    recordedAt: occurredAt,
    entityIds,
    observationIds: ["30000000-0000-4000-8000-000000000001"],
    attributes: { score: 7, category: "attention" },
    assembly: { assemblerId: "test-assembler", assemblerVersion: "1.0.0" },
    reEvaluationStatus: "current",
  };
}

const currentEvent = event(
  "40000000-0000-4000-8000-000000000001",
  "example-reported",
  "2026-06-01T00:00:00.000Z",
);

const observation: Observation = {
  id: "30000000-0000-4000-8000-000000000001",
  artifactId: "50000000-0000-4000-8000-000000000001",
  entityId,
  schemaKey: "severity-indicator",
  value: "high",
  normalisedValue: "high",
  derivation: "machine",
  evidenceStatus: "supported",
  evidenceSegmentId: "60000000-0000-4000-8000-000000000001",
  confidence: 0.95,
  extractor: { id: "fixture-provider", version: "1.0.0" },
  insufficiencyReason: null,
  reviewStatus: "accepted",
  reviewedBy: "test-reviewer",
  reviewedAt: "2026-06-01T00:00:00.000Z",
  createdAt: "2026-06-01T00:00:00.000Z",
};

const context = {
  event: currentEvent,
  observations: [observation],
  events: [
    event(
      "40000000-0000-4000-8000-000000000002",
      "example-inspected",
      "2026-05-31T00:00:00.000Z",
    ),
    event(
      "40000000-0000-4000-8000-000000000003",
      "example-reported",
      "2026-01-01T00:00:00.000Z",
    ),
    event(
      "40000000-0000-4000-8000-000000000004",
      "example-reported",
      "2026-05-31T00:00:00.000Z",
      ["20000000-0000-4000-8000-000000000099"],
    ),
    event(
      "40000000-0000-4000-8000-000000000005",
      "example-reported",
      "2026-05-30T00:00:00.000Z",
    ),
    currentEvent,
  ],
  aggregates: { openCaseCount: 2, openActionCount: 3, pendingDecisionCount: 4 },
};

describe("fact catalogue v1", () => {
  it("resolves allow-listed Event fields and named attributes", () => {
    expect(
      resolveFact({ kind: "event-field", field: "eventType" }, context).value,
    ).toBe("example-reported");
    expect(
      resolveFact(
        { kind: "event-field", field: "attributes", attributeKey: "score" },
        context,
      ).value,
    ).toBe(7);
  });

  it("resolves Observation lookups by schema key and field", () => {
    expect(
      resolveFact(
        { kind: "observation", schemaKey: "severity-indicator", field: "confidence" },
        context,
      ).value,
    ).toBe(0.95);
    expect(
      resolveFact(
        { kind: "observation", schemaKey: "missing-field", field: "value" },
        context,
      ).exists,
    ).toBe(false);
  });

  it("computes related Event counts with Entity, type and time constraints", () => {
    const trace = resolveFact(
      {
        kind: "aggregate",
        aggregate: "related-event-count",
        eventType: "example-inspected",
        withinHours: 48,
      },
      context,
    );
    expect(trace.value).toBe(1);
    expect(trace.relatedEventIds).toEqual(["40000000-0000-4000-8000-000000000002"]);
  });

  it("uses supplied open Case, Action and pending Decision counts", () => {
    expect(resolveFact({ kind: "aggregate", aggregate: "open-case-count" }, context).value).toBe(2);
    expect(resolveFact({ kind: "aggregate", aggregate: "open-action-count" }, context).value).toBe(3);
    expect(
      resolveFact({ kind: "aggregate", aggregate: "pending-decision-count" }, context).value,
    ).toBe(4);
  });
});

describe("condition evaluation", () => {
  it("evaluates all, any and not recursively with complete child traces", () => {
    const trace = evaluateCondition(
      {
        all: [
          {
            any: [
              {
                fact: { kind: "event-field", field: "eventType" },
                operator: "equals",
                value: "not-this-type",
              },
              {
                fact: {
                  kind: "observation",
                  schemaKey: "severity-indicator",
                  field: "value",
                },
                operator: "in",
                value: ["high", "critical"],
              },
            ],
          },
          {
            not: {
              fact: { kind: "aggregate", aggregate: "open-case-count" },
              operator: "less-than",
              value: 1,
            },
          },
        ],
      },
      context,
    );
    expect(trace.result).toBe(true);
    expect(trace).toMatchObject({
      kind: "all",
      children: [{ kind: "any", result: true }, { kind: "not", result: true }],
    });
  });

  it("returns fired actions, rationale and contributing Events", () => {
    const rule: RuleDefinition = {
      id: "example-rule",
      version: "1.0.0",
      description: "Example deterministic rationale",
      when: {
        fact: { kind: "aggregate", aggregate: "related-event-count", withinHours: 48 },
        operator: "greater-than-or-equal",
        value: 2,
      },
      then: [
        { type: "create-signal", definitionId: "example-signal", parameters: { severity: "high" } },
      ],
    };
    const trace = new RuleEngine().evaluate(rule, context);
    expect(trace.result).toBe(true);
    expect(trace.firedActions).toEqual(rule.then);
    expect(trace.rationale).toBe(rule.description);
    expect(trace.referencedEventIds).toEqual([
      "40000000-0000-4000-8000-000000000001",
      "40000000-0000-4000-8000-000000000002",
      "40000000-0000-4000-8000-000000000005",
    ]);
  });
});
