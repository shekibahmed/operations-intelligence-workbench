import { describe, expect, it } from "vitest";

import {
  RuleDefinitionSchema,
  ScenarioPackManifestSchema,
  ScenarioPackSchema,
  WorkflowDefinitionSchema,
} from "./configuration.js";

const validManifest = {
  schemaVersion: "1.0",
  id: "example-pack",
  version: "1.0.0",
  name: "Example Pack",
  description: "A neutral example used to verify the shared manifest contract.",
  labels: "./labels.json",
  entityTypes: [{ id: "record", displayName: "Record", schema: "./schemas/entities/record.json" }],
  eventTypes: [{ id: "record-received", displayName: "Record received", schema: "./schemas/events/record-received.json" }],
  observationSchemas: ["./schemas/observations.json"],
  caseDefinitions: ["./schemas/cases.json"],
  workflows: { default: "./workflows/default.workflow.json" },
  rules: ["./rules/default.rules.json"],
  metrics: ["./metrics/default.metrics.json"],
  dashboards: {
    leadership: "./dashboards/leadership.json",
    operations: "./dashboards/operations.json",
    technical: "./dashboards/technical.json",
  },
  fixtures: {
    smoke: "./fixtures/smoke",
    demo: "./fixtures/demo",
    edgeCases: "./fixtures/edge-cases",
  },
  evaluationSets: ["./evaluations/gold-observations.json"],
  tours: { leadership: "./tours/leadership.json" },
  defaultLens: "leadership",
  defaultFixtureSet: "demo",
} as const;

describe("ScenarioPack manifest contract", () => {
  it("accepts a complete valid manifest", () => {
    expect(ScenarioPackManifestSchema.safeParse(validManifest).success).toBe(true);
    expect(ScenarioPackSchema.safeParse(validManifest).success).toBe(true);
  });

  it("returns precise paths for invalid manifest fields", () => {
    const result = ScenarioPackManifestSchema.safeParse({
      ...validManifest,
      id: "Not Valid",
      dashboards: { ...validManifest.dashboards, technical: "../outside.json" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["id", "dashboards.technical"]),
      );
    }
  });
});

describe("Rule contract and closed fact catalogue", () => {
  const validRule = {
    id: "review-threshold",
    version: "1.0.0",
    description: "Flags a record after the configured count is reached.",
    when: {
      fact: { kind: "aggregate", aggregate: "related-event-count", withinHours: 24 },
      operator: "greater-than-or-equal",
      value: 2,
    },
    then: [{ type: "flag-review", definitionId: "manual-review", parameters: {} }],
  } as const;

  it("accepts a rule using a catalogue fact", () => {
    expect(RuleDefinitionSchema.safeParse(validRule).success).toBe(true);
  });

  it("rejects a rule referencing an unknown fact", () => {
    const result = RuleDefinitionSchema.safeParse({
      ...validRule,
      when: {
        fact: { kind: "aggregate", aggregate: "unknown-count" },
        operator: "equals",
        value: 1,
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain("aggregate");
      expect(JSON.stringify(result.error.issues)).toContain("related-event-count");
    }
  });
});

describe("Workflow contract", () => {
  const validWorkflow = {
    id: "default-workflow",
    version: "1.0.0",
    initialState: "open",
    states: [
      { id: "open", label: "Open", terminal: false },
      { id: "closed", label: "Closed", terminal: true },
    ],
    transitions: [{ id: "close", from: "open", to: "closed" }],
    closureRequirements: [
      {
        id: "review-complete",
        type: "observation-reviewed",
        description: "All required observations have been reviewed.",
      },
    ],
  } as const;

  it("accepts states, transitions, guards and closure requirements", () => {
    expect(WorkflowDefinitionSchema.safeParse(validWorkflow).success).toBe(true);
  });

  it("rejects transitions to undeclared states", () => {
    const result = WorkflowDefinitionSchema.safeParse({
      ...validWorkflow,
      transitions: [{ id: "close", from: "open", to: "missing" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["transitions", 0, "to"]);
    }
  });
});
