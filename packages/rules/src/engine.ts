import type {
  Condition,
  FactReference,
  JsonValue,
  Observation,
  OperationalEvent,
  RuleDefinition,
} from "@oiw/contracts";

type RuleAction = RuleDefinition["then"][number];

export interface CoreAggregateValues {
  openCaseCount: number;
  openActionCount: number;
  pendingDecisionCount: number;
}

export interface RuleEvaluationContext {
  event: OperationalEvent;
  observations: readonly Observation[];
  events: readonly OperationalEvent[];
  aggregates: CoreAggregateValues;
}

export interface FactTrace {
  fact: FactReference;
  exists: boolean;
  value: JsonValue | null;
  relatedEventIds: string[];
}

export interface ComparisonConditionTrace {
  kind: "comparison";
  result: boolean;
  operator: Extract<Condition, { fact: FactReference }>["operator"];
  expected: JsonValue | null;
  fact: FactTrace;
}

export interface GroupConditionTrace {
  kind: "all" | "any";
  result: boolean;
  children: ConditionTrace[];
}

export interface NotConditionTrace {
  kind: "not";
  result: boolean;
  child: ConditionTrace;
}

export type ConditionTrace = ComparisonConditionTrace | GroupConditionTrace | NotConditionTrace;

export interface RuleEvaluationTrace {
  ruleId: string;
  ruleVersion: string;
  eventId: string;
  result: boolean;
  condition: ConditionTrace;
  firedActions: RuleAction[];
  rationale: string;
  referencedEventIds: string[];
}

function stableJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
    .join(",")}}`;
}

function valuesEqual(left: JsonValue, right: JsonValue): boolean {
  return stableJson(left) === stableJson(right);
}

function valuesForComparison(value: JsonValue): JsonValue[] {
  return Array.isArray(value) ? value : [value];
}

function compare(
  actual: JsonValue | undefined,
  operator: ComparisonConditionTrace["operator"],
  expected: JsonValue | undefined,
): boolean {
  const exists = actual !== undefined && actual !== null;
  if (operator === "exists") return exists;
  if (operator === "not-exists") return !exists;
  if (!exists || expected === undefined) return false;

  if (operator === "equals" || operator === "not-equals") {
    const equal = valuesForComparison(actual).some((value) => valuesEqual(value, expected));
    return operator === "equals" ? equal : !equal;
  }

  if (operator === "in" || operator === "not-in") {
    if (!Array.isArray(expected)) return false;
    const included = valuesForComparison(actual).some((actualValue) =>
      expected.some((expectedValue) => valuesEqual(actualValue, expectedValue)),
    );
    return operator === "in" ? included : !included;
  }

  if (typeof actual !== "number" || typeof expected !== "number") return false;
  if (operator === "greater-than") return actual > expected;
  if (operator === "greater-than-or-equal") return actual >= expected;
  if (operator === "less-than") return actual < expected;
  return actual <= expected;
}

function observationFact(
  fact: Extract<FactReference, { kind: "observation" }>,
  observations: readonly Observation[],
): FactTrace {
  const matches = observations.filter((observation) => observation.schemaKey === fact.schemaKey);
  const values = matches.map((observation) => observation[fact.field] as JsonValue | null);
  const value = values.length === 0 ? undefined : values.length === 1 ? values[0] : values;
  return {
    fact,
    exists: value !== undefined && value !== null,
    value: value ?? null,
    relatedEventIds: [],
  };
}

function eventFieldFact(
  fact: Extract<FactReference, { kind: "event-field" }>,
  event: OperationalEvent,
): FactTrace {
  const value =
    fact.field === "attributes"
      ? event.attributes[fact.attributeKey!]
      : (event[fact.field] as JsonValue);
  return {
    fact,
    exists: value !== undefined && value !== null,
    value: value ?? null,
    relatedEventIds: [],
  };
}

function sharesEntity(left: OperationalEvent, right: OperationalEvent): boolean {
  if (left.entityIds.length === 0 || right.entityIds.length === 0) return false;
  const leftIds = new Set(left.entityIds);
  return right.entityIds.some((entityId) => leftIds.has(entityId));
}

function relatedEvents(
  fact: Extract<FactReference, { kind: "aggregate" }>,
  context: RuleEvaluationContext,
): OperationalEvent[] {
  const anchor = Date.parse(context.event.occurredAt);
  const earliest =
    fact.withinHours === undefined ? Number.NEGATIVE_INFINITY : anchor - fact.withinHours * 3_600_000;
  return context.events.filter((event) => {
    if (event.id === context.event.id) return false;
    if (!sharesEntity(context.event, event)) return false;
    if (fact.eventType !== undefined && event.eventType !== fact.eventType) return false;
    const occurredAt = Date.parse(event.occurredAt);
    return occurredAt >= earliest && occurredAt <= anchor;
  });
}

function aggregateFact(
  fact: Extract<FactReference, { kind: "aggregate" }>,
  context: RuleEvaluationContext,
): FactTrace {
  if (fact.aggregate === "related-event-count") {
    const matches = relatedEvents(fact, context);
    return {
      fact,
      exists: true,
      value: matches.length,
      relatedEventIds: matches.map(({ id }) => id).sort(),
    };
  }
  const value =
    fact.aggregate === "open-case-count"
      ? context.aggregates.openCaseCount
      : fact.aggregate === "open-action-count"
        ? context.aggregates.openActionCount
        : context.aggregates.pendingDecisionCount;
  return { fact, exists: true, value, relatedEventIds: [] };
}

export function resolveFact(fact: FactReference, context: RuleEvaluationContext): FactTrace {
  if (fact.kind === "event-field") return eventFieldFact(fact, context.event);
  if (fact.kind === "observation") return observationFact(fact, context.observations);
  return aggregateFact(fact, context);
}

export function evaluateCondition(
  condition: Condition,
  context: RuleEvaluationContext,
): ConditionTrace {
  if ("all" in condition) {
    const children = condition.all.map((child) => evaluateCondition(child, context));
    return { kind: "all", result: children.every(({ result }) => result), children };
  }
  if ("any" in condition) {
    const children = condition.any.map((child) => evaluateCondition(child, context));
    return { kind: "any", result: children.some(({ result }) => result), children };
  }
  if ("not" in condition) {
    const child = evaluateCondition(condition.not, context);
    return { kind: "not", result: !child.result, child };
  }

  const fact = resolveFact(condition.fact, context);
  return {
    kind: "comparison",
    result: compare(fact.exists ? fact.value : undefined, condition.operator, condition.value),
    operator: condition.operator,
    expected: condition.value ?? null,
    fact,
  };
}

function referencedEventIds(trace: ConditionTrace): string[] {
  if (trace.kind === "comparison") return trace.fact.relatedEventIds;
  if (trace.kind === "not") return referencedEventIds(trace.child);
  return trace.children.flatMap(referencedEventIds);
}

export class RuleEngine {
  evaluate(rule: RuleDefinition, context: RuleEvaluationContext): RuleEvaluationTrace {
    const condition = evaluateCondition(rule.when, context);
    return {
      ruleId: rule.id,
      ruleVersion: rule.version,
      eventId: context.event.id,
      result: condition.result,
      condition,
      firedActions: condition.result ? rule.then : [],
      rationale: rule.description,
      referencedEventIds: [...new Set([context.event.id, ...referencedEventIds(condition)])].sort(),
    };
  }
}
