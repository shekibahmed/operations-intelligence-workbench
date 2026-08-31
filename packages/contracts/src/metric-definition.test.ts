import { describe, expect, it } from "vitest";

import { MetricDefinitionSchema, MetricDefinitionV15Schema } from "./domain.js";

const base = {
  id: "open-cases",
  name: "Open cases",
  description: "Open cases in the current workspace.",
  classification: "calculated",
  format: "number",
} as const;

describe("MetricDefinitionSchema v1.5", () => {
  it.each([
    { aggregation: "count", parameters: { recordType: "artifacts" } },
    {
      aggregation: "count-where",
      parameters: {
        recordType: "cases",
        filters: [{ field: "status", operator: "equals", value: "open" }],
      },
    },
    {
      aggregation: "count-by-field",
      parameters: { recordType: "signals", field: "severity" },
    },
    {
      aggregation: "trend-over-time",
      parameters: { recordType: "events", timestampField: "occurredAt", bucket: "week" },
    },
    {
      aggregation: "sla-derived",
      parameters: { recordType: "action-items", atRiskWithinHours: 24 },
    },
  ])("accepts the closed $aggregation aggregation", (aggregation) => {
    expect(MetricDefinitionV15Schema.safeParse({ ...base, ...aggregation }).success).toBe(true);
  });

  it("rejects aggregation kinds outside the closed vocabulary", () => {
    expect(
      MetricDefinitionV15Schema.safeParse({
        ...base,
        aggregation: "arbitrary-query",
        parameters: { sql: "select * from cases" },
      }).success,
    ).toBe(false);
  });

  it("keeps the frozen pre-v1.5 Metric type additive for existing in-process consumers", () => {
    expect(
      MetricDefinitionSchema.safeParse({
        ...base,
        aggregation: "count-records",
        parameters: { excludeStatus: "closed" },
      }).success,
    ).toBe(true);
  });

  it("rejects filters and timestamps that do not belong to the target record", () => {
    const result = MetricDefinitionV15Schema.safeParse({
      ...base,
      aggregation: "trend-over-time",
      parameters: {
        recordType: "signals",
        timestampField: "receivedAt",
        bucket: "day",
        filters: [{ field: "decisionType", operator: "equals", value: "approve" }],
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map(({ path }) => path.join("."))).toEqual(
        expect.arrayContaining([
          "parameters.filters.0.field",
          "parameters.timestampField",
        ]),
      );
    }
  });

  it("requires assumptions for hypothetical metrics and forbids them elsewhere", () => {
    const hypothetical = {
      ...base,
      classification: "hypothetical",
      aggregation: "count",
      parameters: { recordType: "cases" },
    };
    expect(MetricDefinitionV15Schema.safeParse(hypothetical).success).toBe(false);
    expect(
      MetricDefinitionV15Schema.safeParse({
        ...hypothetical,
        parameters: {
          recordType: "cases",
          illustrative: {
            summary: "Illustrative exposure only.",
            assumptions: { hoursPerCase: 8 },
          },
        },
      }).success,
    ).toBe(true);
    expect(
      MetricDefinitionV15Schema.safeParse({
        ...base,
        aggregation: "count",
        parameters: {
          recordType: "cases",
          illustrative: {
            summary: "This must not be attached to a calculated metric.",
            assumptions: { hoursPerCase: 8 },
          },
        },
      }).success,
    ).toBe(false);
  });
});
