import {
  RuleDefinitionSchema,
  type Condition,
  type JsonValue,
  type RuleDefinition,
} from "@oiw/contracts";
import { z } from "zod";

import { issueError, type PackIssue } from "./errors.js";

/**
 * A pack rule file is a non-empty list of rule definitions. The fact
 * catalogue itself (A2) is already closed by `FactReferenceSchema` in the
 * frozen contracts package; parsing against it rejects any unknown fact
 * kind or field.
 */
export const RuleFileSchema = z.array(RuleDefinitionSchema).min(1);

function extractStringValues(value: JsonValue | undefined): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return [];
}

export function collectEventTypeReferences(condition: Condition): string[] {
  if ("all" in condition) {
    return condition.all.flatMap(collectEventTypeReferences);
  }
  if ("any" in condition) {
    return condition.any.flatMap(collectEventTypeReferences);
  }
  if ("not" in condition) {
    return collectEventTypeReferences(condition.not);
  }

  const { fact } = condition;
  if (fact.kind === "event-field" && fact.field === "eventType") {
    return extractStringValues(condition.value);
  }
  if (fact.kind === "aggregate" && fact.eventType !== undefined) {
    return [fact.eventType];
  }
  return [];
}

export function validateRuleEventTypes(
  rules: readonly RuleDefinition[],
  declaredEventTypeIds: ReadonlySet<string>,
  relativePath: string,
): PackIssue[] {
  const issues: PackIssue[] = [];
  rules.forEach((rule, ruleIndex) => {
    for (const eventTypeId of collectEventTypeReferences(rule.when)) {
      if (!declaredEventTypeIds.has(eventTypeId)) {
        issues.push(
          issueError(
            `${relativePath}#[${ruleIndex}].when`,
            `Rule "${rule.id}" references undeclared event type "${eventTypeId}"`,
          ),
        );
      }
    }
  });
  return issues;
}
