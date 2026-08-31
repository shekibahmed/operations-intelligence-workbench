import {
  MetricDefinitionV15Schema,
  type ActionItem,
  type Artifact,
  type Case,
  type Decision,
  type MetricDefinitionV15,
  type MetricField,
  type MetricFilter,
  type MetricIllustrativeParameters,
  type MetricRecordType,
  type MetricTimestampField,
  type MetricTimeWindow,
  type OperationalEvent,
  type Signal,
} from "@oiw/contracts";

interface MetricRepository<T> {
  list(workspaceId: string): Promise<T[]>;
}

export interface MetricEvaluationRepositories {
  cases: MetricRepository<Case>;
  signals: MetricRepository<Signal>;
  decisions: MetricRepository<Decision>;
  actionItems: MetricRepository<ActionItem>;
  operationalEvents: MetricRepository<OperationalEvent>;
  artifacts: MetricRepository<Artifact>;
}

export interface MetricEvaluationPack {
  metricDefinitions: ReadonlyMap<string, MetricDefinitionV15>;
}

export interface MetricTrendPoint {
  periodStart: string;
  count: number;
}

export type MetricSlaBucket = "overdue" | "at-risk" | "on-track" | "unscheduled";

export interface MetricSlaRow {
  bucket: MetricSlaBucket;
  count: number;
}

export type MetricEvaluationValue =
  | { type: "number"; value: number }
  | { type: "breakdown"; value: Record<string, number> }
  | { type: "time-series"; value: MetricTrendPoint[] }
  | { type: "table"; value: MetricSlaRow[] }
  | {
      type: "hypothetical";
      value: null;
      illustrative: MetricIllustrativeParameters;
    };

export interface MetricEvaluationResult {
  id: string;
  name: string;
  description: string;
  classification: MetricDefinitionV15["classification"];
  aggregation: MetricDefinitionV15["aggregation"];
  format: MetricDefinitionV15["format"];
  result: MetricEvaluationValue;
}

type MetricRecord = Case | Signal | Decision | ActionItem | OperationalEvent | Artifact;

function readField(record: MetricRecord, field: MetricField): string | null {
  if (!(field in record)) return null;
  const value = record[field as keyof typeof record];
  return typeof value === "string" ? value : null;
}

function readTimestamp(record: MetricRecord, field: MetricTimestampField): string | null {
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
  const value = readTimestamp(record, window.field);
  if (value === null) return false;
  const timestamp = Date.parse(value);
  return (
    (window.from === undefined || timestamp >= Date.parse(window.from)) &&
    (window.to === undefined || timestamp <= Date.parse(window.to))
  );
}

function filteredRecords(
  records: readonly MetricRecord[],
  filters: readonly MetricFilter[],
  window: MetricTimeWindow | undefined,
): MetricRecord[] {
  return records.filter(
    (record) => withinTimeWindow(record, window) && filters.every((filter) => matchesFilter(record, filter)),
  );
}

function bucketStart(timestamp: string, bucket: "day" | "week" | "month"): string {
  const date = new Date(timestamp);
  if (bucket === "month") {
    date.setUTCDate(1);
  } else if (bucket === "week") {
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  }
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

export class MetricEvaluationService {
  constructor(
    private readonly repositories: MetricEvaluationRepositories,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async evaluateMetrics(
    workspaceId: string,
    pack: MetricEvaluationPack,
    metricIds?: readonly string[],
  ): Promise<MetricEvaluationResult[]> {
    const definitions = this.selectDefinitions(pack.metricDefinitions, metricIds);
    const results: MetricEvaluationResult[] = [];
    for (const definition of definitions) {
      results.push(await this.evaluateMetric(workspaceId, definition));
    }
    return results;
  }

  private selectDefinitions(
    catalogue: ReadonlyMap<string, MetricDefinitionV15>,
    metricIds: readonly string[] | undefined,
  ): MetricDefinitionV15[] {
    const ids = metricIds ?? [...catalogue.keys()];
    const seen = new Set<string>();
    return ids.map((metricId) => {
      if (seen.has(metricId)) throw new Error(`Metric "${metricId}" was requested more than once`);
      seen.add(metricId);
      const definition = catalogue.get(metricId);
      if (definition === undefined) throw new Error(`Metric definition "${metricId}" was not found`);
      return MetricDefinitionV15Schema.parse(definition);
    });
  }

  private async evaluateMetric(
    workspaceId: string,
    definition: MetricDefinitionV15,
  ): Promise<MetricEvaluationResult> {
    const base = {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      classification: definition.classification,
      aggregation: definition.aggregation,
      format: definition.format,
    };
    if (definition.classification === "hypothetical") {
      const illustrative = definition.parameters.illustrative;
      if (illustrative === undefined) {
        throw new Error(`Hypothetical Metric "${definition.id}" has no illustrative assumptions`);
      }
      return { ...base, result: { type: "hypothetical", value: null, illustrative } };
    }

    const records = await this.loadRecords(workspaceId, definition.parameters.recordType);
    const window = definition.parameters.timeWindow;
    switch (definition.aggregation) {
      case "count":
        return {
          ...base,
          result: { type: "number", value: filteredRecords(records, [], window).length },
        };
      case "count-where":
        return {
          ...base,
          result: {
            type: "number",
            value: filteredRecords(records, definition.parameters.filters, window).length,
          },
        };
      case "count-by-field": {
        const matching = filteredRecords(records, definition.parameters.filters ?? [], window);
        const breakdown: Record<string, number> = {};
        for (const record of matching) {
          const value = readField(record, definition.parameters.field) ?? "unspecified";
          breakdown[value] = (breakdown[value] ?? 0) + 1;
        }
        return {
          ...base,
          result: {
            type: "breakdown",
            value: Object.fromEntries(Object.entries(breakdown).sort(([left], [right]) => left.localeCompare(right))),
          },
        };
      }
      case "trend-over-time": {
        const matching = filteredRecords(records, definition.parameters.filters ?? [], window);
        const counts = new Map<string, number>();
        for (const record of matching) {
          const timestamp = readTimestamp(record, definition.parameters.timestampField);
          if (timestamp === null) continue;
          const periodStart = bucketStart(timestamp, definition.parameters.bucket);
          counts.set(periodStart, (counts.get(periodStart) ?? 0) + 1);
        }
        return {
          ...base,
          result: {
            type: "time-series",
            value: [...counts.entries()]
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([periodStart, count]) => ({ periodStart, count })),
          },
        };
      }
      case "sla-derived": {
        const matching = filteredRecords(records, definition.parameters.filters ?? [], window);
        const now = this.clock().getTime();
        const atRiskBoundary = now + definition.parameters.atRiskWithinHours * 60 * 60 * 1_000;
        const counts: Record<MetricSlaBucket, number> = {
          overdue: 0,
          "at-risk": 0,
          "on-track": 0,
          unscheduled: 0,
        };
        for (const record of matching) {
          const dueAt = readTimestamp(record, "dueAt");
          if (dueAt === null) counts.unscheduled += 1;
          else if (Date.parse(dueAt) < now) counts.overdue += 1;
          else if (Date.parse(dueAt) <= atRiskBoundary) counts["at-risk"] += 1;
          else counts["on-track"] += 1;
        }
        return {
          ...base,
          result: {
            type: "table",
            value: (["overdue", "at-risk", "on-track", "unscheduled"] as const).map((bucket) => ({
              bucket,
              count: counts[bucket],
            })),
          },
        };
      }
    }
  }

  private async loadRecords(workspaceId: string, recordType: MetricRecordType): Promise<MetricRecord[]> {
    const records = await {
      cases: this.repositories.cases,
      signals: this.repositories.signals,
      decisions: this.repositories.decisions,
      "action-items": this.repositories.actionItems,
      events: this.repositories.operationalEvents,
      artifacts: this.repositories.artifacts,
    }[recordType].list(workspaceId);
    const foreign = records.find((record) => record.workspaceId !== workspaceId);
    if (foreign !== undefined) {
      throw new Error(`Metric repository returned a record outside workspace "${workspaceId}"`);
    }
    return [...records].sort((left, right) => left.id.localeCompare(right.id));
  }
}
