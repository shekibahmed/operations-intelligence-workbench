import type { MetricDefinition } from "@oiw/contracts";

export const stubMetricDefinitions: MetricDefinition[] = [
  {
    id: "critical-signal-count",
    name: "Critical signals",
    description: "Count of open signals at critical severity.",
    classification: "calculated",
    aggregation: "count-by-field",
    parameters: { field: "severity", equals: "critical" },
    format: "number",
  },
  {
    id: "open-case-count",
    name: "Open cases",
    description: "Count of cases not in a terminal workflow state.",
    classification: "calculated",
    aggregation: "count-records",
    parameters: { excludeStatus: "closed" },
    format: "number",
  },
  {
    id: "pending-decision-count",
    name: "Pending decisions",
    description: "Count of decisions awaiting human approval.",
    classification: "calculated",
    aggregation: "count-by-field",
    parameters: { field: "status", equals: "awaiting-approval" },
    format: "number",
  },
  {
    id: "case-sla-risk",
    name: "Cases due within 48 hours",
    description: "Open cases whose due date falls within the SLA risk threshold.",
    classification: "calculated",
    aggregation: "due-date-risk",
    parameters: { thresholdHours: 48 },
    format: "number",
  },
  {
    id: "repeat-fault-projection",
    name: "Illustrative downtime exposure",
    description: "Hypothetical downtime cost if the current repeat-fault pattern continues unaddressed.",
    classification: "hypothetical",
    aggregation: "ratio",
    parameters: { basis: "repeat-fault-signal-count" },
    format: "currency",
  },
];

/**
 * Resolved values for the Leadership Overview widget catalogue (UX_SPEC §6),
 * computed here rather than by a live aggregation engine (non-goal: "no
 * dashboards beyond static A5 widget placeholders").
 */
export const overviewMetrics = {
  criticalSignals: { value: 1, classification: "calculated" as const },
  openCases: { value: 2, classification: "calculated" as const },
  pendingDecisions: { value: 1, classification: "calculated" as const },
  illustrativeDowntimeExposure: { value: "~$18,000", classification: "hypothetical" as const },
};
