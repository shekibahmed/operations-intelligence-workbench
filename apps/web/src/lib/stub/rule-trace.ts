import { auditEntryIds, entityIds, eventIds, ruleId, signalIds } from "@/lib/stub/ids";

/**
 * A rule execution's fact/condition/outcome trace (UX_SPEC §5.12 R13). Not a
 * frozen contract type: `packages/contracts` defines `RuleDefinition` (the
 * rule's static shape) but not the runtime trace of one evaluation, which is
 * Wave 2 rule-engine output. Local to `apps/web` until that engine exists.
 */
export interface FactEvaluation {
  fact: string;
  resolvedValue: string;
  source: string;
}

export interface ConditionNode {
  label: string;
  result: "pass" | "fail";
  children?: ConditionNode[];
}

export interface RuleTrace {
  ruleId: string;
  ruleVersion: string;
  description: string;
  triggeringEventId: string;
  facts: FactEvaluation[];
  condition: ConditionNode;
  outcome: string;
  stateTransitions: string[];
  auditEntryIds: string[];
}

export const stubRuleTrace: RuleTrace = {
  ruleId: ruleId.id,
  ruleVersion: ruleId.version,
  description:
    "Escalate to a critical repeat-fault signal and propose a hold-from-service decision when a component has a recent related fault and the current report contains a safety indicator.",
  triggeringEventId: eventIds.faultReported,
  facts: [
    {
      fact: "related-event-count (fault-reported, within 720h)",
      resolvedValue: "2",
      source: `aggregate over entity ${entityIds.assetPrimary}`,
    },
    {
      fact: "observation(symptom).normalisedValue",
      resolvedValue: "grinding-noise",
      source: "fault-reported event observations",
    },
  ],
  condition: {
    label: "AND",
    result: "pass",
    children: [
      { label: "related-event-count >= 2", result: "pass" },
      { label: "symptom in [grinding-noise, burning-smell, visible-crack]", result: "pass" },
    ],
  },
  outcome: `Signal ${signalIds.repeatFault} created (critical); decision proposed (hold-from-service, high risk).`,
  stateTransitions: ["case: none → open", "case: open → in-progress (action items attached)"],
  auditEntryIds: [auditEntryIds[3]!, auditEntryIds[4]!, auditEntryIds[5]!],
};
