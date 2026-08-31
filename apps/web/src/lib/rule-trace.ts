import type { AuditEntry, FactReference, JsonValue, RuleDefinition } from "@oiw/contracts";

type RuleAction = RuleDefinition["then"][number];

/**
 * Mirrors `@oiw/rules`' `ConditionTrace`/`FactTrace` shapes (the runtime
 * evaluation trace, not the frozen `RuleDefinition` contract). Those types
 * are package-internal to `@oiw/rules`, so this is a structural read of the
 * JSON `@oiw/application`'s `artifact-advancement.ts` persists verbatim as
 * the `rule-evaluated` Audit Entry's `data.condition` (see its
 * `appendOperationalAuditOnce` call) — real, not fabricated, data.
 */
interface PersistedFactTrace {
  fact: FactReference;
  exists: boolean;
  value: JsonValue | null;
  relatedEventIds: string[];
}

interface PersistedComparisonTrace {
  kind: "comparison";
  result: boolean;
  operator: string;
  expected: JsonValue | null;
  fact: PersistedFactTrace;
}

interface PersistedGroupTrace {
  kind: "all" | "any";
  result: boolean;
  children: PersistedConditionTrace[];
}

interface PersistedNotTrace {
  kind: "not";
  result: boolean;
  child: PersistedConditionTrace;
}

type PersistedConditionTrace = PersistedComparisonTrace | PersistedGroupTrace | PersistedNotTrace;

export interface RuleTraceFactRow {
  label: string;
  resolvedValue: string;
  source: string;
}

export interface RuleTraceConditionNode {
  label: string;
  result: boolean;
  children: RuleTraceConditionNode[];
}

export interface RuleTraceView {
  evaluation: AuditEntry;
  ruleId: string;
  ruleVersion: string;
  description: string;
  eventId: string;
  occurredAt: string;
  result: boolean;
  rationale: string;
  facts: RuleTraceFactRow[];
  condition: RuleTraceConditionNode;
  firedActions: RuleAction[];
  referencedEventIds: string[];
}

const OPERATOR_LABEL: Record<string, string> = {
  equals: "=",
  "not-equals": "≠",
  in: "in",
  "not-in": "not in",
  "greater-than": ">",
  "greater-than-or-equal": "≥",
  "less-than": "<",
  "less-than-or-equal": "≤",
  exists: "exists",
  "not-exists": "does not exist",
};

function factLabel(fact: FactReference): string {
  if (fact.kind === "event-field") {
    return fact.field === "attributes" ? `event.attributes.${fact.attributeKey}` : `event.${fact.field}`;
  }
  if (fact.kind === "observation") {
    return `observation(${fact.schemaKey}).${fact.field}`;
  }
  const scope = fact.eventType !== undefined ? ` of type "${fact.eventType}"` : "";
  const window = fact.withinHours !== undefined ? ` within ${fact.withinHours}h` : "";
  return `${fact.aggregate}${scope}${window}`;
}

function factSource(fact: PersistedFactTrace): string {
  if (fact.fact.kind === "event-field") return "the triggering event";
  if (fact.fact.kind === "observation") return "this event's observations";
  return fact.relatedEventIds.length > 0
    ? `aggregate over ${fact.relatedEventIds.length} related event(s)`
    : "aggregate over this workspace's events";
}

function valueLabel(value: JsonValue | null): string {
  if (value === null) return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function comparisonLabel(node: PersistedComparisonTrace): string {
  const operator = OPERATOR_LABEL[node.operator] ?? node.operator;
  const resolved = valueLabel(node.fact.exists ? node.fact.value : null);
  if (node.operator === "exists" || node.operator === "not-exists") {
    return `${factLabel(node.fact.fact)} ${operator} (resolved: ${resolved})`;
  }
  return `${factLabel(node.fact.fact)} ${operator} ${valueLabel(node.expected)} (resolved: ${resolved})`;
}

function collectFacts(node: PersistedConditionTrace, seen: Map<string, RuleTraceFactRow>): void {
  if (node.kind === "comparison") {
    const key = `${factLabel(node.fact.fact)}:${JSON.stringify(node.fact.value)}`;
    if (!seen.has(key)) {
      seen.set(key, {
        label: factLabel(node.fact.fact),
        resolvedValue: node.fact.exists ? valueLabel(node.fact.value) : "Not present",
        source: factSource(node.fact),
      });
    }
    return;
  }
  if (node.kind === "not") {
    collectFacts(node.child, seen);
    return;
  }
  for (const child of node.children) collectFacts(child, seen);
}

function toDisplayNode(node: PersistedConditionTrace): RuleTraceConditionNode {
  if (node.kind === "comparison") {
    return { label: comparisonLabel(node), result: node.result, children: [] };
  }
  if (node.kind === "not") {
    return { label: "NOT", result: node.result, children: [toDisplayNode(node.child)] };
  }
  return {
    label: node.kind === "all" ? "ALL of" : "ANY of",
    result: node.result,
    children: node.children.map(toDisplayNode),
  };
}

/**
 * Builds a Rule trace view (UX_SPEC §5.12 R13) from the workspace's real
 * `rule-evaluated` Audit Entries (persisted by
 * `ArtifactAdvancementService.advanceArtifact`, OIW-501). A rule can be
 * evaluated once per assembled Event, so `eventId` disambiguates which
 * execution to show; omitted, this picks the most recent evaluation of
 * `ruleId` (preferring one that actually fired, so the default view is the
 * more informative one).
 */
export function buildRuleTraceView(
  entries: readonly AuditEntry[],
  ruleId: string,
  eventId?: string,
): RuleTraceView | null {
  const evaluations = entries
    .filter((entry) => entry.action === "rule-evaluated" && entry.data["ruleId"] === ruleId)
    .filter((entry) => eventId === undefined || entry.subject.id === eventId)
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
  if (evaluations.length === 0) return null;

  const mostRecentFired = eventId === undefined ? [...evaluations].reverse().find((entry) => entry.data["result"] === true) : undefined;
  const evaluation = mostRecentFired ?? evaluations[evaluations.length - 1]!;

  const condition = evaluation.data["condition"] as unknown as PersistedConditionTrace;
  const facts = new Map<string, RuleTraceFactRow>();
  collectFacts(condition, facts);

  return {
    evaluation,
    ruleId,
    ruleVersion: String(evaluation.data["ruleVersion"] ?? ""),
    description: evaluation.cause,
    eventId: evaluation.subject.id,
    occurredAt: evaluation.occurredAt,
    result: evaluation.data["result"] === true,
    rationale: String(evaluation.data["rationale"] ?? evaluation.cause),
    facts: [...facts.values()],
    condition: toDisplayNode(condition),
    firedActions: (evaluation.data["firedActions"] as unknown as RuleAction[]) ?? [],
    referencedEventIds: (evaluation.data["referencedEventIds"] as string[] | undefined) ?? [],
  };
}

export interface RuleTraceOutcome {
  actionType: RuleAction["type"];
  definitionId: string;
  description: string;
  stateTransition: string;
  auditEntryId: string | null;
  integrationPoint: boolean;
}

/**
 * Correlates each fired action back to the real Audit Entry its executor
 * persisted (`@oiw/application`'s `rule-execution.ts`): `create-signal` and
 * `flag-review` executed for real since OIW-501; `create-case`/`create-action`/
 * `propose-decision` execute for real since OIW-506's case/action/decision
 * engine merged, each correlated below to its own `case-created`/
 * `action-item-created`/`decision-proposed` Audit Entry.
 */
export function resolveOutcomes(view: RuleTraceView, entries: readonly AuditEntry[]): RuleTraceOutcome[] {
  return view.firedActions.map((action) => {
    if (action.type === "create-case") {
      const match = entries.find(
        (entry) => entry.action === "case-created" && entry.data["ruleId"] === view.ruleId && entry.data["eventId"] === view.eventId,
      );
      return {
        actionType: action.type,
        definitionId: action.definitionId,
        description:
          match !== undefined
            ? `Case created — "${match.data["caseType"]}" (${match.subject.id}).`
            : "This Case already existed for the related Entity — the rule's outcome reconciled it rather than creating a new one.",
        stateTransition: match !== undefined ? "No Case → open Case." : "Existing Case reconciled with this Event's Signal(s).",
        auditEntryId: match?.id ?? null,
        integrationPoint: false,
      };
    }
    if (action.type === "create-action") {
      const match = entries.find(
        (entry) => entry.action === "action-item-created" && entry.data["ruleId"] === view.ruleId && entry.data["eventId"] === view.eventId,
      );
      return {
        actionType: action.type,
        definitionId: action.definitionId,
        description:
          match !== undefined
            ? `Action item created — "${match.data["actionType"]}" on Case ${match.data["caseId"]}.`
            : "Action item already existed for this Case (idempotent replay).",
        stateTransition: "No Action item → open Action item.",
        auditEntryId: match?.id ?? null,
        integrationPoint: false,
      };
    }
    if (action.type === "propose-decision") {
      const match = entries.find((entry) => entry.action === "decision-proposed" && entry.data["ruleId"] === view.ruleId);
      return {
        actionType: action.type,
        definitionId: action.definitionId,
        description:
          match !== undefined
            ? `Decision proposed — "${match.data["riskLevel"]}" risk, awaiting approval (${match.subject.id}).`
            : "Decision proposal did not persist (idempotent replay or evaluation without effect).",
        stateTransition: "No Decision → proposed → awaiting-approval.",
        auditEntryId: match?.id ?? null,
        integrationPoint: false,
      };
    }
    if (action.type === "create-signal") {
      const match = entries.find(
        (entry) =>
          entry.action === "signal-created" &&
          entry.data["ruleId"] === view.ruleId &&
          entry.data["ruleVersion"] === view.ruleVersion &&
          Array.isArray(entry.data["eventIds"]) &&
          (entry.data["eventIds"] as string[]).includes(view.eventId),
      );
      return {
        actionType: action.type,
        definitionId: action.definitionId,
        description:
          match !== undefined
            ? `Signal created — "${match.data["signalType"]}", severity ${match.data["severity"]}.`
            : "Signal creation did not persist (idempotent replay or evaluation without effect).",
        stateTransition: "No workflow state transition — a Signal does not change Case/Entity state on its own.",
        auditEntryId: match?.id ?? null,
        integrationPoint: false,
      };
    }
    if (action.type === "flag-review") {
      const match = entries.find(
        (entry) =>
          entry.action === "rule-review-flagged" &&
          entry.subject.id === view.eventId &&
          entry.data["ruleId"] === view.ruleId &&
          entry.data["ruleVersion"] === view.ruleVersion,
      );
      const artifactIds = Array.isArray(match?.data["artifactIds"]) ? (match.data["artifactIds"] as string[]) : [];
      return {
        actionType: action.type,
        definitionId: action.definitionId,
        description:
          match !== undefined
            ? "Every Observation-linked Artifact for this event was flagged needs-review."
            : "Review flag did not persist (idempotent replay or evaluation without effect).",
        stateTransition:
          match !== undefined
            ? `Artifact processing status: processed → needs-review (${artifactIds.length} artifact(s)).`
            : "No state transition recorded.",
        auditEntryId: match?.id ?? null,
        integrationPoint: false,
      };
    }
    const match = entries.find(
      (entry) =>
        entry.action === "rule-action-pending" &&
        entry.subject.id === view.eventId &&
        entry.data["ruleId"] === view.ruleId &&
        entry.data["ruleVersion"] === view.ruleVersion &&
        entry.data["actionType"] === action.type,
    );
    return {
      actionType: action.type,
      definitionId: action.definitionId,
      description: `Unrecognized action type "${action.type}" for "${action.definitionId}" — no executor is registered for it in this build.`,
      stateTransition: "No transition recorded.",
      auditEntryId: match?.id ?? null,
      integrationPoint: true,
    };
  });
}
