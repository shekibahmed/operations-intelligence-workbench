import type { Condition, RuleDefinition } from "@oiw/contracts";
import { describe, expect, it } from "vitest";

import { collectEventTypeReferences, RuleFileSchema, validateRuleEventTypes } from "./rules.js";

function rule(when: Condition): RuleDefinition {
  return {
    id: "example-rule",
    version: "1.0.0",
    description: "Example rule for unit tests.",
    when,
    then: [{ type: "flag-review", definitionId: "needs-triage", parameters: {} }],
  };
}

describe("collectEventTypeReferences", () => {
  it("collects event types from equals/in comparisons and nested all/any/not", () => {
    const condition: Condition = {
      all: [
        { fact: { kind: "event-field", field: "eventType" }, operator: "equals", value: "fault-reported" },
        {
          any: [
            { fact: { kind: "event-field", field: "eventType" }, operator: "in", value: ["repair-started", "repair-completed"] },
            { not: { fact: { kind: "event-field", field: "eventType" }, operator: "equals", value: "asset-released" } },
          ],
        },
        { fact: { kind: "aggregate", aggregate: "related-event-count", eventType: "inspection-completed" }, operator: "greater-than", value: 2 },
      ],
    };

    expect(collectEventTypeReferences(condition)).toEqual(
      expect.arrayContaining(["fault-reported", "repair-started", "repair-completed", "asset-released", "inspection-completed"]),
    );
  });

  it("ignores non-eventType facts", () => {
    const condition: Condition = {
      fact: { kind: "observation", schemaKey: "severity", field: "value" },
      operator: "exists",
    };
    expect(collectEventTypeReferences(condition)).toEqual([]);
  });
});

describe("validateRuleEventTypes", () => {
  it("passes when every referenced event type is declared", () => {
    const rules = [
      rule({ fact: { kind: "event-field", field: "eventType" }, operator: "equals", value: "fault-reported" }),
    ];
    const issues = validateRuleEventTypes(rules, new Set(["fault-reported"]), "rules/example.json");
    expect(issues).toEqual([]);
  });

  it("reports an error naming the rule and the undeclared event type", () => {
    const rules = [
      rule({ fact: { kind: "event-field", field: "eventType" }, operator: "equals", value: "phantom-event" }),
    ];
    const issues = validateRuleEventTypes(rules, new Set(["fault-reported"]), "rules/example.json");
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.path).toBe("rules/example.json#[0].when");
    expect(issues[0]?.message).toContain("example-rule");
    expect(issues[0]?.message).toContain("phantom-event");
  });
});

describe("RuleFileSchema", () => {
  it("requires at least one rule", () => {
    expect(RuleFileSchema.safeParse([]).success).toBe(false);
  });

  it("rejects a fact kind outside the closed catalogue", () => {
    const result = RuleFileSchema.safeParse([
      rule({ fact: { kind: "phantom-kind", field: "eventType" }, operator: "equals", value: "x" } as unknown as Condition),
    ]);
    expect(result.success).toBe(false);
  });
});
