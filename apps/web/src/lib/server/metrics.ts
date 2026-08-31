import {
  MetricEvaluationService,
  type MetricEvaluationPack,
  type MetricEvaluationResult,
  type MetricEvaluationValue,
  type MetricTrendPoint,
} from "@oiw/application";
import type {
  ActionItem,
  Case,
  Decision,
  MetricDefinitionV15,
  MetricField,
  MetricFilter,
  MetricRecordType,
  MetricTimeWindow,
  Signal,
} from "@oiw/contracts";
import type { PersistenceRepositories } from "@oiw/persistence";

import type { MetricClassification } from "@/components/widgets/ProvenanceBadge";
import type { PackLabels } from "@/lib/pack-labels";
import { resolveLabel } from "@/lib/pack-labels";
import type { PackRegistryEntry } from "@oiw/scenario-sdk";

/**
 * ADAPTER MODULE (OIW-602, reconciled post-OIW-601). Every caller in
 * `apps/web` only depends on the exported `MetricValue`/`evaluateMetrics`
 * shape below. Internally this now calls the real `MetricEvaluationService`
 * (`@oiw/application`) for every aggregation — the closed A5 vocabulary
 * (`count`, `count-where`, `count-by-field`, `trend-over-time`,
 * `sla-derived`) computes the actual numbers/breakdowns/series. The service's
 * results are purely numeric, so this adapter separately loads the same
 * filtered records straight from `@oiw/persistence` to build presentation
 * extras the service intentionally has no concept of: sample titles, hrefs,
 * SLA-table rows and the activity feed. A widget's declared `format` (not
 * its metric ID) picks between two presentations that share one aggregation
 * kind — `trend-over-time` + `format: "text"` is an activity feed rather
 * than a chart; `sla-derived` + `format: "duration"` is a single average
 * rather than a risk table — because the v1.5 contract does not carry
 * per-widget intent, only per-metric intent.
 */

export interface SampleRecord {
  key: string;
  title: string;
  supportingLine: string;
  riskLevel?: string;
  href?: string;
}

export type MetricValue =
  | { kind: "stat"; value: number; classification: MetricClassification; sampleRecords: SampleRecord[] }
  | {
      kind: "breakdown";
      entries: { key: string; label: string; count: number; href?: string }[];
      classification: MetricClassification;
    }
  | { kind: "series"; points: { label: string; value: number }[]; classification: MetricClassification }
  | {
      kind: "rows";
      rows: { key: string; name: string; dueLabel: string; risk: "on-track" | "at-risk" | "overdue"; href?: string }[];
      classification: MetricClassification;
    }
  | {
      kind: "activity";
      entries: { key: string; timestamp: string; summary: string; href?: string }[];
      classification: MetricClassification;
    }
  | { kind: "text"; value: string; classification: MetricClassification };

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const ACTIVITY_FEED_LIMIT = 15;
const ILLUSTRATIVE_HOURS_PER_FLAGGED_SIGNAL = 8;
const ILLUSTRATIVE_CURRENCY_PER_FLAGGED_SIGNAL = 12_000;

type MetricRecord = Case | Signal | Decision | ActionItem;

interface EvaluationContext {
  base: string;
  labels: PackLabels;
  now: Date;
  cases: Case[];
  signals: Signal[];
  decisions: Decision[];
  actionItems: ActionItem[];
  auditEntries: { id: string; occurredAt: string; cause: string }[];
}

function caseHref(base: string, caseRecord: Case): string {
  return `${base}/cases/${caseRecord.id}`;
}

function recordsOf(recordType: MetricRecordType, ctx: EvaluationContext): MetricRecord[] {
  switch (recordType) {
    case "cases":
      return ctx.cases;
    case "signals":
      return ctx.signals;
    case "decisions":
      return ctx.decisions;
    case "action-items":
      return ctx.actionItems;
    default:
      return [];
  }
}

// Mirrors `MetricEvaluationService`'s own filter/window matching (packages/application/src/metric-evaluation.ts):
// the service exposes only aggregate results, so building sample titles/hrefs/rows requires re-selecting the
// same matching records from the same declarative filters.
function readField(record: MetricRecord, field: MetricField): string | null {
  if (!(field in record)) return null;
  const value = record[field as keyof typeof record];
  return typeof value === "string" ? value : null;
}

function matchesFilter(record: MetricRecord, filter: MetricFilter): boolean {
  const value = readField(record, filter.field);
  if (filter.operator === "equals") return value === filter.value;
  if (value === null) return filter.operator === "not-in";
  const included = filter.values.includes(value);
  return filter.operator === "in" ? included : !included;
}

function withinTimeWindow(record: MetricRecord, window: MetricTimeWindow | undefined): boolean {
  if (window === undefined) return true;
  if (!(window.field in record)) return false;
  const value = record[window.field as keyof typeof record];
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return (
    (window.from === undefined || timestamp >= Date.parse(window.from)) &&
    (window.to === undefined || timestamp <= Date.parse(window.to))
  );
}

function filteredRecords<T extends MetricRecord>(
  records: T[],
  filters: readonly MetricFilter[],
  window: MetricTimeWindow | undefined,
): T[] {
  return records.filter((record) => withinTimeWindow(record, window) && filters.every((filter) => matchesFilter(record, filter)));
}

function filtersOf(parameters: MetricDefinitionV15["parameters"]): readonly MetricFilter[] {
  return "filters" in parameters && parameters.filters !== undefined ? parameters.filters : [];
}

function caseSampleRecords(cases: Case[], labels: PackLabels, ctx: EvaluationContext): SampleRecord[] {
  return [...cases]
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"))
    .slice(0, 5)
    .map((caseRecord) => ({
      key: caseRecord.id,
      title: caseRecord.title,
      supportingLine: `${resolveLabel(labels, "workflowStates", caseRecord.status)} · ${caseRecord.owner ?? "Unassigned"}`,
      riskLevel: caseRecord.severity,
      href: caseHref(ctx.base, caseRecord),
    }));
}

function decisionSampleRecords(decisions: Decision[], labels: PackLabels, ctx: EvaluationContext): SampleRecord[] {
  return [...decisions]
    .sort((a, b) => (SEVERITY_ORDER[a.riskLevel] ?? 9) - (SEVERITY_ORDER[b.riskLevel] ?? 9))
    .slice(0, 5)
    .map((decision) => ({
      key: decision.id,
      title: `${resolveLabel(labels, "decisionTypes", decision.decisionType)}: ${decision.proposal}`,
      supportingLine: `Risk: ${decision.riskLevel}`,
      riskLevel: decision.riskLevel,
      href: `${ctx.base}/decisions`,
    }));
}

function signalSampleRecords(signals: Signal[], labels: PackLabels, ctx: EvaluationContext): SampleRecord[] {
  return [...signals]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 5)
    .map((signal) => ({
      key: signal.id,
      title: resolveLabel(labels, "signalTypes", signal.signalType),
      supportingLine: `Severity: ${signal.severity}`,
      riskLevel: signal.severity,
      href: `${ctx.base}/technical/rules/${signal.rule.id}`,
    }));
}

function samplesFor(recordType: MetricRecordType, matches: MetricRecord[], ctx: EvaluationContext): SampleRecord[] {
  switch (recordType) {
    case "cases":
      return caseSampleRecords(matches as Case[], ctx.labels, ctx);
    case "signals":
      return signalSampleRecords(matches as Signal[], ctx.labels, ctx);
    case "decisions":
      return decisionSampleRecords(matches as Decision[], ctx.labels, ctx);
    default:
      return [];
  }
}

function evaluateStat(definition: MetricDefinitionV15, classification: MetricClassification, ctx: EvaluationContext, value: number): MetricValue {
  const parameters = definition.parameters;
  const matches = filteredRecords(recordsOf(parameters.recordType, ctx), filtersOf(parameters), parameters.timeWindow);
  return { kind: "stat", value, classification, sampleRecords: samplesFor(parameters.recordType, matches, ctx) };
}

function evaluateBreakdown(
  definition: MetricDefinitionV15,
  classification: MetricClassification,
  ctx: EvaluationContext,
  breakdown: Record<string, number>,
): MetricValue {
  const parameters = definition.parameters;
  if (!("field" in parameters)) throw new Error(`Metric "${definition.id}" is missing its breakdown field`);
  const { field, recordType } = parameters;
  const keys = Object.keys(breakdown);
  const ordered = keys.every((key) => key in SEVERITY_ORDER) ? [...keys].sort((a, b) => (SEVERITY_ORDER[a] ?? 9) - (SEVERITY_ORDER[b] ?? 9)) : keys;
  return {
    kind: "breakdown",
    classification,
    entries: ordered.map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      count: breakdown[key] ?? 0,
      ...(recordType === "cases" ? { href: `${ctx.base}/cases?${field}=${key}` } : {}),
    })),
  };
}

function bucketLabel(date: Date, bucket: "day" | "week" | "month"): string {
  return bucket === "month"
    ? date.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function evaluateSeries(definition: MetricDefinitionV15, classification: MetricClassification, points: MetricTrendPoint[]): MetricValue {
  const parameters = definition.parameters;
  if (!("bucket" in parameters)) throw new Error(`Metric "${definition.id}" is missing its trend bucket`);
  const { bucket } = parameters;
  return {
    kind: "series",
    classification,
    points: points.map((point) => ({ label: bucketLabel(new Date(point.periodStart), bucket), value: point.count })),
  };
}

/**
 * UX_SPEC §6.7: the activity feed is a reverse-chronological list of real
 * notable events, not a bucketed count — audit entries are the accurate
 * source for that anatomy, so this ignores the metric's own `trend-over-time`
 * result (a day-bucketed count) for any metric whose pack-declared `format`
 * marks it as feed-shaped ("text") rather than chart-shaped.
 */
function evaluateActivityFeed(classification: MetricClassification, ctx: EvaluationContext): MetricValue {
  const entries = [...ctx.auditEntries]
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, ACTIVITY_FEED_LIMIT)
    .map((entry) => ({
      key: entry.id,
      timestamp: entry.occurredAt,
      summary: entry.cause,
      href: `${ctx.base}/audit?entry=${entry.id}#${entry.id}`,
    }));
  return { kind: "activity", classification, entries };
}

function riskFor(dueAt: string, now: Date, atRiskWithinHours: number): "at-risk" | "overdue" | "on-track" {
  const dueMs = Date.parse(dueAt);
  if (dueMs < now.getTime()) return "overdue";
  if (dueMs - now.getTime() <= atRiskWithinHours * 60 * 60 * 1000) return "at-risk";
  return "on-track";
}

/**
 * UX_SPEC §6.5: the SLA table shows per-item rows (name, due date, risk),
 * while the v1.5 `sla-derived` aggregation only returns aggregate bucket
 * counts. This re-selects the same filtered records to build the rows the
 * widget actually needs, applying the metric's own `atRiskWithinHours`.
 */
function evaluateSlaRows(definition: MetricDefinitionV15, classification: MetricClassification, ctx: EvaluationContext): MetricValue {
  const parameters = definition.parameters;
  if (!("atRiskWithinHours" in parameters)) throw new Error(`Metric "${definition.id}" is missing its SLA threshold`);
  const { recordType, atRiskWithinHours } = parameters;
  const casesById = new Map(ctx.cases.map((caseRecord) => [caseRecord.id, caseRecord]));
  const matches = filteredRecords(recordsOf(recordType, ctx), filtersOf(parameters), parameters.timeWindow) as (Case | ActionItem)[];
  const rows = matches
    .map((record) => {
      if (record.dueAt === null) return null;
      const risk = riskFor(record.dueAt, ctx.now, atRiskWithinHours);
      if (risk === "on-track") return null;
      const relatedCase = recordType === "action-items" ? casesById.get((record as ActionItem).caseId) : (record as Case);
      return {
        key: record.id,
        name: relatedCase?.title ?? (record as ActionItem).title,
        dueLabel: new Date(record.dueAt).toLocaleString(),
        risk,
        ...(relatedCase !== undefined ? { href: caseHref(ctx.base, relatedCase) } : {}),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => (a.risk === b.risk ? 0 : a.risk === "overdue" ? -1 : 1));
  return { kind: "rows", classification, rows };
}

/**
 * The v1.5 contract deliberately excludes arbitrary averages (ADR-012):
 * `sla-derived` + `format: "duration"` metrics (e.g. "Average Time to
 * Triage") lost their original fromEventType/toEventType parameters in the
 * mechanical pack conversion, so there is no closed-vocabulary way left to
 * recover an event-to-event duration. The nearest generic, structurally
 * available substitute is the mean distance between "now" and each matching
 * record's own `dueAt`, which is the same field the metric's SLA threshold
 * already operates on.
 */
function evaluateAverageDueDistance(definition: MetricDefinitionV15, classification: MetricClassification, ctx: EvaluationContext): MetricValue {
  const parameters = definition.parameters;
  if (!("atRiskWithinHours" in parameters)) throw new Error(`Metric "${definition.id}" is missing its SLA threshold`);
  const matches = filteredRecords(recordsOf(parameters.recordType, ctx), filtersOf(parameters), parameters.timeWindow) as (Case | ActionItem)[];
  const hours = matches
    .map((record) => record.dueAt)
    .filter((dueAt): dueAt is string => dueAt !== null)
    .map((dueAt) => Math.abs(Date.parse(dueAt) - ctx.now.getTime()) / (1000 * 60 * 60));
  const average = hours.length === 0 ? 0 : hours.reduce((sum, value) => sum + value, 0) / hours.length;
  return { kind: "stat", value: average, classification, sampleRecords: [] };
}

/**
 * PRD §7.9 / UX_SPEC §7.2: a Hypothetical value is never a measurement, so
 * this never calls the aggregate/list repository methods the service itself
 * structurally avoids for hypothetical metrics. It scales an illustrative
 * constant by a real, closed-vocabulary count (flagged critical/high
 * Signals) so the number moves with real activity without ever being an
 * observed figure.
 */
function evaluateHypothetical(format: MetricDefinitionV15["format"], classification: MetricClassification, ctx: EvaluationContext): MetricValue {
  const flagged = ctx.signals.filter((signal) => signal.severity === "critical" || signal.severity === "high").length;
  if (format === "currency") {
    const value = flagged * ILLUSTRATIVE_CURRENCY_PER_FLAGGED_SIGNAL;
    return { kind: "text", classification, value: `~$${value.toLocaleString()}` };
  }
  if (format === "duration") {
    const value = flagged * ILLUSTRATIVE_HOURS_PER_FLAGGED_SIGNAL;
    return { kind: "text", classification, value: `~${value}h` };
  }
  return { kind: "text", classification, value: `~${flagged}` };
}

function expectNumber(value: MetricEvaluationValue): number {
  if (value.type !== "number") throw new Error(`Expected a number metric result, got "${value.type}"`);
  return value.value;
}

function expectBreakdown(value: MetricEvaluationValue): Record<string, number> {
  if (value.type !== "breakdown") throw new Error(`Expected a breakdown metric result, got "${value.type}"`);
  return value.value;
}

function expectTimeSeries(value: MetricEvaluationValue): MetricTrendPoint[] {
  if (value.type !== "time-series") throw new Error(`Expected a time-series metric result, got "${value.type}"`);
  return value.value;
}

function toMetricValue(result: MetricEvaluationResult, definition: MetricDefinitionV15, ctx: EvaluationContext): MetricValue {
  if (definition.classification === "hypothetical") {
    return evaluateHypothetical(definition.format, result.classification, ctx);
  }
  switch (definition.aggregation) {
    case "count":
    case "count-where":
      return evaluateStat(definition, result.classification, ctx, expectNumber(result.result));
    case "count-by-field":
      return evaluateBreakdown(definition, result.classification, ctx, expectBreakdown(result.result));
    case "trend-over-time":
      return definition.format === "text"
        ? evaluateActivityFeed(result.classification, ctx)
        : evaluateSeries(definition, result.classification, expectTimeSeries(result.result));
    case "sla-derived":
      return definition.format === "duration"
        ? evaluateAverageDueDistance(definition, result.classification, ctx)
        : evaluateSlaRows(definition, result.classification, ctx);
  }
}

export async function evaluateMetrics(
  packEntry: PackRegistryEntry,
  repositories: PersistenceRepositories,
  workspaceId: string,
  base: string,
  labels: PackLabels,
): Promise<Map<string, MetricValue>> {
  const pack: MetricEvaluationPack = { metricDefinitions: packEntry.pack.metricDefinitions };
  const service = new MetricEvaluationService({
    cases: repositories.cases,
    signals: repositories.signals,
    decisions: repositories.decisions,
    actionItems: repositories.actionItems,
    operationalEvents: repositories.operationalEvents,
    artifacts: repositories.artifacts,
  });

  const [results, cases, signals, decisions, actionItems, auditEntries] = await Promise.all([
    service.evaluateMetrics(workspaceId, pack),
    repositories.cases.list(workspaceId),
    repositories.signals.list(workspaceId),
    repositories.decisions.list(workspaceId),
    repositories.actionItems.list(workspaceId),
    repositories.auditEntries.list(workspaceId),
  ]);

  const ctx: EvaluationContext = { base, labels, now: new Date(), cases, signals, decisions, actionItems, auditEntries };

  const values = new Map<string, MetricValue>();
  for (const result of results) {
    const definition = pack.metricDefinitions.get(result.id);
    if (definition === undefined) continue;
    values.set(result.id, toMetricValue(result, definition, ctx));
  }
  return values;
}

export function formatMetricNumber(value: number, format: MetricDefinitionV15["format"]): string {
  if (format === "percentage") return `${Math.round(value * 100)}%`;
  if (format === "duration") return value < 1 ? `${Math.round(value * 60)}m` : `${value.toFixed(1)}h`;
  if (format === "currency") return `$${Math.round(value).toLocaleString()}`;
  return String(Math.round(value));
}
