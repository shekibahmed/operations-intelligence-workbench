import {
  MetricDefinitionV15Schema,
  type ActionItem,
  type Artifact,
  type Case,
  type Decision,
  type MetricDefinitionV15,
  type OperationalEvent,
  type Signal,
} from "@oiw/contracts";
import { describe, expect, it, vi } from "vitest";

import { MetricEvaluationService, type MetricEvaluationRepositories } from "./metric-evaluation.js";

const workspaceId = "00000000-0000-4000-8000-000000000001";
const otherWorkspaceId = "00000000-0000-4000-8000-000000000002";
const now = "2026-09-01T12:00:00.000Z";

function metric(input: Omit<MetricDefinitionV15, "id" | "name" | "description" | "classification" | "format"> & Partial<MetricDefinitionV15>): MetricDefinitionV15 {
  return MetricDefinitionV15Schema.parse({
    id: "test-metric",
    name: "Test Metric",
    description: "A neutral metric used by the evaluator unit tests.",
    classification: "calculated",
    format: "number",
    ...input,
  });
}

function caseRecord(id: string, overrides: Partial<Case> = {}): Case {
  return {
    id,
    workspaceId,
    caseType: "review-case",
    title: "Review case",
    status: "open",
    priority: "normal",
    severity: "medium",
    owner: null,
    dueAt: "2026-09-02T12:00:00.000Z",
    relatedEntityIds: [],
    relatedEventIds: [],
    relatedSignalIds: [],
    closureRequirementIds: [],
    reEvaluationStatus: "current",
    createdAt: "2026-08-30T12:00:00.000Z",
    updatedAt: "2026-08-30T12:00:00.000Z",
    ...overrides,
  };
}

function eventRecord(id: string, occurredAt: string): OperationalEvent {
  return {
    id,
    workspaceId,
    eventType: "record-received",
    occurredAt,
    recordedAt: occurredAt,
    entityIds: [],
    observationIds: ["00000000-0000-4000-8000-000000000099"],
    attributes: {},
    assembly: { assemblerId: "test-assembler", assemblerVersion: "1.0.0" },
    reEvaluationStatus: "current",
  };
}

function repositories(input: {
  cases?: Case[];
  signals?: Signal[];
  decisions?: Decision[];
  actionItems?: ActionItem[];
  operationalEvents?: OperationalEvent[];
  artifacts?: Artifact[];
} = {}): MetricEvaluationRepositories {
  return {
    cases: { list: vi.fn(async () => input.cases ?? []) },
    signals: { list: vi.fn(async () => input.signals ?? []) },
    decisions: { list: vi.fn(async () => input.decisions ?? []) },
    actionItems: { list: vi.fn(async () => input.actionItems ?? []) },
    operationalEvents: { list: vi.fn(async () => input.operationalEvents ?? []) },
    artifacts: { list: vi.fn(async () => input.artifacts ?? []) },
  };
}

async function evaluate(
  definition: MetricDefinitionV15,
  repositorySet: MetricEvaluationRepositories,
) {
  return (
    await new MetricEvaluationService(repositorySet, () => new Date(now)).evaluateMetrics(
      workspaceId,
      { metricDefinitions: new Map([[definition.id, definition]]) },
    )
  )[0]!;
}

describe("MetricEvaluationService", () => {
  it("evaluates count with an absolute time window", async () => {
    const result = await evaluate(
      metric({
        aggregation: "count",
        parameters: {
          recordType: "cases",
          timeWindow: { field: "createdAt", from: "2026-08-30T00:00:00.000Z" },
        },
      }),
      repositories({
        cases: [
          caseRecord("00000000-0000-4000-8000-000000000011"),
          caseRecord("00000000-0000-4000-8000-000000000012", {
            createdAt: "2026-08-29T23:59:59.000Z",
          }),
        ],
      }),
    );
    expect(result.result).toEqual({ type: "number", value: 1 });
  });

  it("evaluates count-where with closed field filters", async () => {
    const result = await evaluate(
      metric({
        aggregation: "count-where",
        parameters: {
          recordType: "cases",
          filters: [
            { field: "status", operator: "not-in", values: ["closed"] },
            { field: "severity", operator: "in", values: ["high", "critical"] },
          ],
        },
      }),
      repositories({
        cases: [
          caseRecord("00000000-0000-4000-8000-000000000021", { severity: "critical" }),
          caseRecord("00000000-0000-4000-8000-000000000022", { severity: "low" }),
          caseRecord("00000000-0000-4000-8000-000000000023", {
            severity: "high",
            status: "closed",
          }),
        ],
      }),
    );
    expect(result.result).toEqual({ type: "number", value: 1 });
  });

  it("evaluates count-by-field into a stable breakdown", async () => {
    const result = await evaluate(
      metric({
        aggregation: "count-by-field",
        parameters: { recordType: "cases", field: "severity" },
      }),
      repositories({
        cases: [
          caseRecord("00000000-0000-4000-8000-000000000031", { severity: "critical" }),
          caseRecord("00000000-0000-4000-8000-000000000032", { severity: "medium" }),
          caseRecord("00000000-0000-4000-8000-000000000033", { severity: "critical" }),
        ],
      }),
    );
    expect(result.result).toEqual({
      type: "breakdown",
      value: { critical: 2, medium: 1 },
    });
  });

  it("evaluates trend-over-time into Monday-based UTC week buckets", async () => {
    const result = await evaluate(
      metric({
        aggregation: "trend-over-time",
        parameters: { recordType: "events", timestampField: "occurredAt", bucket: "week" },
      }),
      repositories({
        operationalEvents: [
          eventRecord("00000000-0000-4000-8000-000000000041", "2026-08-31T10:00:00.000Z"),
          eventRecord("00000000-0000-4000-8000-000000000042", "2026-09-06T23:00:00.000Z"),
          eventRecord("00000000-0000-4000-8000-000000000043", "2026-09-07T00:00:00.000Z"),
        ],
      }),
    );
    expect(result.result).toEqual({
      type: "time-series",
      value: [
        { periodStart: "2026-08-31T00:00:00.000Z", count: 2 },
        { periodStart: "2026-09-07T00:00:00.000Z", count: 1 },
      ],
    });
  });

  it("evaluates sla-derived into due-date table rows", async () => {
    const result = await evaluate(
      metric({
        aggregation: "sla-derived",
        parameters: { recordType: "cases", atRiskWithinHours: 24 },
      }),
      repositories({
        cases: [
          caseRecord("00000000-0000-4000-8000-000000000051", {
            dueAt: "2026-09-01T11:59:59.000Z",
          }),
          caseRecord("00000000-0000-4000-8000-000000000052", {
            dueAt: "2026-09-02T11:00:00.000Z",
          }),
          caseRecord("00000000-0000-4000-8000-000000000053", {
            dueAt: "2026-09-03T12:00:00.000Z",
          }),
          caseRecord("00000000-0000-4000-8000-000000000054", { dueAt: null }),
        ],
      }),
    );
    expect(result.result).toEqual({
      type: "table",
      value: [
        { bucket: "overdue", count: 1 },
        { bucket: "at-risk", count: 1 },
        { bucket: "on-track", count: 1 },
        { bucket: "unscheduled", count: 1 },
      ],
    });
  });

  it("returns hypothetical assumptions without reading operational repositories", async () => {
    const repositorySet = repositories({
      cases: [caseRecord("00000000-0000-4000-8000-000000000061")],
    });
    const result = await evaluate(
      metric({
        classification: "hypothetical",
        aggregation: "count",
        format: "duration",
        parameters: {
          recordType: "cases",
          illustrative: {
            summary: "Illustrative only.",
            assumptions: { hoursPerCase: 8 },
          },
        },
      }),
      repositorySet,
    );
    expect(result).toMatchObject({
      classification: "hypothetical",
      format: "duration",
      result: {
        type: "hypothetical",
        value: null,
        illustrative: { assumptions: { hoursPerCase: 8 } },
      },
    });
    for (const repository of Object.values(repositorySet)) {
      expect(repository.list).not.toHaveBeenCalled();
    }
  });

  it("fails closed if a repository violates workspace scope", async () => {
    await expect(
      evaluate(
        metric({ aggregation: "count", parameters: { recordType: "cases" } }),
        repositories({
          cases: [
            caseRecord("00000000-0000-4000-8000-000000000071", {
              workspaceId: otherWorkspaceId,
            }),
          ],
        }),
      ),
    ).rejects.toThrow("outside workspace");
  });
});
