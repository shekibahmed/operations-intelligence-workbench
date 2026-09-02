import type { ArtifactSegment, JsonValue } from "@oiw/contracts";

export const metricNames = [
  "fieldPrecision",
  "fieldRecall",
  "classificationAccuracy",
  "evidenceSpanCorrectness",
  "entityResolutionAccuracy",
  "abstentionPrecision",
  "abstentionRecall",
  "ruleExecutionCorrectness",
  "approvalPolicyCorrectness",
  "duplicateEventPrevention",
  "caseStateCorrectness",
] as const;

export type MetricName = (typeof metricNames)[number];
export type ObservationStatus = "extracted" | "insufficient-evidence" | "negated";

export interface ScoredObservation {
  schemaKey: string;
  status: ObservationStatus;
  value: JsonValue | null;
  evidenceLocator: ArtifactSegment["locator"] | null;
}

export interface DecisionAssessment {
  ruleId: string;
  riskLevel: string;
  approvalRequired: boolean;
  status: string;
  approvalCount: number;
  bypassProtected: boolean;
}

export interface EvaluationSample {
  fixtureId: string;
  enabledMetrics?: MetricName[];
  artifactText: string | null;
  expectedObservations: ScoredObservation[];
  actualObservations: ScoredObservation[];
  categoricalSchemaKeys: string[];
  expectedEventType: string | null;
  actualEventType: string | null;
  expectedEntities: string[];
  actualEntities: string[];
  expectedSignals: string[];
  actualSignals: string[];
  expectedDecision: {
    ruleId: string;
    approvalRequired: boolean;
    riskLevel: string;
  } | null;
  actualDecision: DecisionAssessment | null;
  expectedCaseLinkage: boolean;
  actualCaseStates: string[];
  validCaseStates: string[];
}

export interface DuplicateEvaluationSample {
  fixtureId: string;
  originalFixtureId: string;
  inserted: boolean;
  duplicateOfArtifactId: string | null;
  originalArtifactId: string;
  eventCountBefore: number;
  eventCountAfter: number;
  signalCountBefore: number;
  signalCountAfter: number;
  caseCountBefore: number;
  caseCountAfter: number;
  idempotent: boolean;
  duplicateSuppressed: boolean;
}

export interface MetricResult {
  score: number;
  passed: number;
  total: number;
  threshold: number;
  failures: string[];
}

export type MetricResults = Record<MetricName, MetricResult>;

export interface PackEvaluationResult {
  packId: string;
  passed: boolean;
  fixtureCount: number;
  duplicateFixtureCount: number;
  metrics: MetricResults;
}

export interface EvaluationResult {
  schemaVersion: "1.0";
  provider: "fixture";
  generatedAt: string;
  passed: boolean;
  packs: PackEvaluationResult[];
  aggregate: MetricResults;
}
