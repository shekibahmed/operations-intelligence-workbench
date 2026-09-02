import type { ArtifactSegment } from "@oiw/contracts";

import {
  metricNames,
  type DuplicateEvaluationSample,
  type EvaluationSample,
  type MetricName,
  type MetricResult,
  type MetricResults,
  type ScoredObservation,
} from "./types.js";

interface MutableMetric {
  passed: number;
  total: number;
  failures: string[];
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
    .join(",")}}`;
}

function observationKey(observation: ScoredObservation): string {
  return `${observation.schemaKey}\u0000${observation.status}\u0000${stableJson(observation.value)}`;
}

function valueKey(observation: ScoredObservation): string {
  return `${observation.schemaKey}\u0000${stableJson(observation.value)}`;
}

function newMetrics(): Record<MetricName, MutableMetric> {
  return metricNames.reduce<Record<MetricName, MutableMetric>>(
    (metrics, name) => {
      metrics[name] = { passed: 0, total: 0, failures: [] };
      return metrics;
    },
    {} as Record<MetricName, MutableMetric>,
  );
}

function record(
  metrics: Record<MetricName, MutableMetric>,
  name: MetricName,
  passed: boolean,
  failure: string,
): void {
  metrics[name].total += 1;
  if (passed) metrics[name].passed += 1;
  else metrics[name].failures.push(failure);
}

function enabled(sample: EvaluationSample, name: MetricName): boolean {
  return sample.enabledMetrics === undefined || sample.enabledMetrics.includes(name);
}

function multiset(values: readonly ScoredObservation[], key: (value: ScoredObservation) => string) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return counts;
}

function consume(counts: Map<string, number>, key: string): boolean {
  const count = counts.get(key) ?? 0;
  if (count === 0) return false;
  counts.set(key, count - 1);
  return true;
}

function lineAt(text: string, offset: number): number {
  let line = 0;
  for (let index = 0; index < Math.min(offset, text.length); index += 1) {
    if (text[index] === "\n") line += 1;
  }
  return line;
}

export function evidenceLocatorsMatch(
  expected: ArtifactSegment["locator"],
  actual: ArtifactSegment["locator"],
  artifactText: string | null,
): boolean {
  if (expected.kind !== actual.kind) return false;
  if (expected.kind !== "text-range" || actual.kind !== "text-range") {
    return stableJson(expected) === stableJson(actual);
  }
  const withinTolerance =
    Math.abs(expected.start - actual.start) <= 5 && Math.abs(expected.end - actual.end) <= 5;
  if (!withinTolerance) return false;
  return artifactText === null || lineAt(artifactText, expected.start) === lineAt(artifactText, actual.start);
}

function scoreFields(
  metrics: Record<MetricName, MutableMetric>,
  sample: EvaluationSample,
): void {
  const expectedValues = sample.expectedObservations.filter(({ value }) => value !== null);
  const actualValues = sample.actualObservations.filter(({ value }) => value !== null);
  const expectedForPrecision = multiset(expectedValues, valueKey);
  for (const actual of actualValues) {
    const passed = consume(expectedForPrecision, valueKey(actual));
    if (enabled(sample, "fieldPrecision")) {
      record(
        metrics,
        "fieldPrecision",
        passed,
        `${sample.fixtureId}/${actual.schemaKey}: unexpected extracted value ${stableJson(actual.value)}`,
      );
    }
  }
  const actualForRecall = multiset(actualValues, valueKey);
  for (const expected of expectedValues) {
    const passed = consume(actualForRecall, valueKey(expected));
    if (enabled(sample, "fieldRecall")) {
      record(
        metrics,
        "fieldRecall",
        passed,
        `${sample.fixtureId}/${expected.schemaKey}: missing gold value ${stableJson(expected.value)}`,
      );
    }
  }
}

function scoreClassifications(
  metrics: Record<MetricName, MutableMetric>,
  sample: EvaluationSample,
): void {
  if (!enabled(sample, "classificationAccuracy")) return;
  if (sample.expectedEventType !== null || sample.actualEventType !== null) {
    record(
      metrics,
      "classificationAccuracy",
      sample.expectedEventType === sample.actualEventType,
      `${sample.fixtureId}/eventType: expected ${stableJson(sample.expectedEventType)}, received ${stableJson(sample.actualEventType)}`,
    );
  }
  const categorical = new Set(sample.categoricalSchemaKeys);
  const actual = multiset(
    sample.actualObservations.filter((observation) => categorical.has(observation.schemaKey)),
    observationKey,
  );
  for (const expected of sample.expectedObservations.filter((observation) =>
    categorical.has(observation.schemaKey),
  )) {
    const passed = consume(actual, observationKey(expected));
    record(
      metrics,
      "classificationAccuracy",
      passed,
      `${sample.fixtureId}/${expected.schemaKey}: categorical gold ${stableJson(expected.value)} was not reproduced`,
    );
  }
}

function scoreEvidence(
  metrics: Record<MetricName, MutableMetric>,
  sample: EvaluationSample,
): void {
  if (!enabled(sample, "evidenceSpanCorrectness")) return;
  const remaining = [...sample.actualObservations];
  for (const expected of sample.expectedObservations.filter(({ value }) => value !== null)) {
    const index = remaining.findIndex((actual) => valueKey(actual) === valueKey(expected));
    const actual = index === -1 ? undefined : remaining.splice(index, 1)[0];
    const passed =
      expected.evidenceLocator !== null &&
      actual?.evidenceLocator !== null &&
      actual?.evidenceLocator !== undefined &&
      evidenceLocatorsMatch(expected.evidenceLocator, actual.evidenceLocator, sample.artifactText);
    record(
      metrics,
      "evidenceSpanCorrectness",
      passed,
      `${sample.fixtureId}/${expected.schemaKey}: expected evidence ${stableJson(expected.evidenceLocator)}, received ${stableJson(actual?.evidenceLocator ?? null)}`,
    );
  }
}

function scoreEntities(
  metrics: Record<MetricName, MutableMetric>,
  sample: EvaluationSample,
): void {
  if (!enabled(sample, "entityResolutionAccuracy")) return;
  const allowed = new Set(sample.expectedEntities);
  const uniqueActual = [...new Set(sample.actualEntities)];
  const passed =
    uniqueActual.every((reference) => allowed.has(reference)) &&
    (sample.expectedEntities.length === 0 ? uniqueActual.length === 0 : uniqueActual.length > 0);
  record(
    metrics,
    "entityResolutionAccuracy",
    passed,
    `${sample.fixtureId}/entities: expected allowed references ${stableJson(sample.expectedEntities)}, received ${stableJson(uniqueActual)}`,
  );
}

function scoreAbstention(
  metrics: Record<MetricName, MutableMetric>,
  sample: EvaluationSample,
): void {
  const isNegative = ({ status }: ScoredObservation) => status !== "extracted";
  const expectedNegative = sample.expectedObservations.filter(isNegative);
  const actualNegative = sample.actualObservations.filter(isNegative);
  const expectedForPrecision = multiset(expectedNegative, observationKey);
  for (const actual of actualNegative) {
    const passed = consume(expectedForPrecision, observationKey(actual));
    if (enabled(sample, "abstentionPrecision")) {
      record(
        metrics,
        "abstentionPrecision",
        passed,
        `${sample.fixtureId}/${actual.schemaKey}: unexpected ${actual.status} outcome`,
      );
    }
  }
  const actualForRecall = multiset(actualNegative, observationKey);
  for (const expected of expectedNegative) {
    const passed = consume(actualForRecall, observationKey(expected));
    if (enabled(sample, "abstentionRecall")) {
      record(
        metrics,
        "abstentionRecall",
        passed,
        `${sample.fixtureId}/${expected.schemaKey}: expected ${expected.status}, received no matching non-assertion`,
      );
    }
  }
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return stableJson([...new Set(left)].sort()) === stableJson([...new Set(right)].sort());
}

function scoreRules(
  metrics: Record<MetricName, MutableMetric>,
  sample: EvaluationSample,
): void {
  if (!enabled(sample, "ruleExecutionCorrectness")) return;
  const passed = sameStrings(sample.expectedSignals, sample.actualSignals);
  record(
    metrics,
    "ruleExecutionCorrectness",
    passed,
    `${sample.fixtureId}/rules: expected signal rules ${stableJson(sample.expectedSignals)}, received ${stableJson(sample.actualSignals)}`,
  );
}

function scoreApproval(
  metrics: Record<MetricName, MutableMetric>,
  sample: EvaluationSample,
): void {
  if (!enabled(sample, "approvalPolicyCorrectness")) return;
  const expected = sample.expectedDecision;
  const actual = sample.actualDecision;
  const passed =
    expected === null
      ? actual === null
      : actual !== null &&
        actual.ruleId === expected.ruleId &&
        actual.riskLevel === expected.riskLevel &&
        actual.approvalRequired === expected.approvalRequired &&
        actual.status === "awaiting-approval" &&
        actual.approvalCount === 0 &&
        actual.bypassProtected;
  record(
    metrics,
    "approvalPolicyCorrectness",
    passed,
    `${sample.fixtureId}/approval: expected ${stableJson(expected)}, received ${stableJson(actual)}`,
  );
}

function scoreCases(
  metrics: Record<MetricName, MutableMetric>,
  sample: EvaluationSample,
): void {
  if (!enabled(sample, "caseStateCorrectness")) return;
  const linked = sample.actualCaseStates.length > 0;
  const validStates = new Set(sample.validCaseStates);
  const passed =
    linked === sample.expectedCaseLinkage &&
    sample.actualCaseStates.every((status) => validStates.has(status));
  record(
    metrics,
    "caseStateCorrectness",
    passed,
    `${sample.fixtureId}/case: expected linkage ${String(sample.expectedCaseLinkage)} and valid states ${stableJson(sample.validCaseStates)}, received ${stableJson(sample.actualCaseStates)}`,
  );
}

function scoreDuplicate(
  metrics: Record<MetricName, MutableMetric>,
  sample: DuplicateEvaluationSample,
): void {
  const passed =
    !sample.inserted &&
    sample.duplicateOfArtifactId === sample.originalArtifactId &&
    sample.eventCountAfter === sample.eventCountBefore &&
    sample.signalCountAfter === sample.signalCountBefore &&
    sample.caseCountAfter === sample.caseCountBefore &&
    sample.idempotent &&
    sample.duplicateSuppressed;
  record(
    metrics,
    "duplicateEventPrevention",
    passed,
    `${sample.fixtureId}/duplicate-of/${sample.originalFixtureId}: inserted=${String(sample.inserted)}, artifact=${String(sample.duplicateOfArtifactId)}, counts events ${sample.eventCountBefore}->${sample.eventCountAfter}, signals ${sample.signalCountBefore}->${sample.signalCountAfter}, cases ${sample.caseCountBefore}->${sample.caseCountAfter}, idempotent=${String(sample.idempotent)}, suppressed=${String(sample.duplicateSuppressed)}`,
  );
}

export function scoreEvaluationSamples(
  samples: readonly EvaluationSample[],
  duplicates: readonly DuplicateEvaluationSample[],
  thresholds: Partial<Record<MetricName, number>> = {},
): MetricResults {
  const metrics = newMetrics();
  for (const sample of samples) {
    scoreFields(metrics, sample);
    scoreClassifications(metrics, sample);
    scoreEvidence(metrics, sample);
    scoreEntities(metrics, sample);
    scoreAbstention(metrics, sample);
    scoreRules(metrics, sample);
    scoreApproval(metrics, sample);
    scoreCases(metrics, sample);
  }
  for (const duplicate of duplicates) scoreDuplicate(metrics, duplicate);

  return Object.fromEntries(
    metricNames.map((name) => {
      const metric = metrics[name];
      const threshold = thresholds[name] ?? 1;
      const result: MetricResult = {
        score: metric.total === 0 ? 1 : metric.passed / metric.total,
        passed: metric.passed,
        total: metric.total,
        threshold,
        failures: metric.failures,
      };
      return [name, result];
    }),
  ) as MetricResults;
}

export function metricsPass(metrics: MetricResults): boolean {
  return metricNames.every((name) => metrics[name].score >= metrics[name].threshold);
}

export function aggregateMetricResults(results: readonly MetricResults[]): MetricResults {
  return Object.fromEntries(
    metricNames.map((name) => {
      const passed = results.reduce((sum, metrics) => sum + metrics[name].passed, 0);
      const total = results.reduce((sum, metrics) => sum + metrics[name].total, 0);
      const threshold = results[0]?.[name].threshold ?? 1;
      return [
        name,
        {
          score: total === 0 ? 1 : passed / total,
          passed,
          total,
          threshold,
          failures: results.flatMap((metrics) => metrics[name].failures),
        },
      ];
    }),
  ) as MetricResults;
}
