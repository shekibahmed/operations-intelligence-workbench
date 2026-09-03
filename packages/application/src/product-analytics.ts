import { randomUUID } from "node:crypto";

export const PRODUCT_ANALYTICS_EVENT_NAMES = [
  "landing-page-view",
  "scenario-selected",
  "demo-started",
  "artifact-opened",
  "artifact-processed",
  "observation-reviewed",
  "case-opened",
  "decision-viewed",
  "decision-approved",
  "technical-trace-viewed",
  "lens-switched",
  "tour-completed",
  "cta-opened",
  "assessment-submitted",
] as const;

export type ProductAnalyticsEventName = (typeof PRODUCT_ANALYTICS_EVENT_NAMES)[number];

export interface ProductAnalyticsEventContext {
  path?: string | undefined;
  scenarioId?: string | undefined;
  lens?: "leadership" | "operations" | "technical" | undefined;
  subjectId?: string | undefined;
  entry?: "tour" | "free" | undefined;
  outcome?: "approved" | "rejected" | "more-information-required" | undefined;
}

export interface ProductAnalyticsEvent {
  id: string;
  workspaceId: string | null;
  sessionId: string;
  name: ProductAnalyticsEventName;
  context: ProductAnalyticsEventContext;
  occurredAt: string;
}

export interface ProductAnalyticsEventRepository {
  insert(event: ProductAnalyticsEvent): Promise<boolean>;
}

export interface ProductAnalyticsServiceOptions {
  clock?: () => Date;
  createId?: () => string;
}

const EVENT_NAMES = new Set<string>(PRODUCT_ANALYTICS_EVENT_NAMES);
const LENSES = new Set(["leadership", "operations", "technical"]);
const ENTRIES = new Set(["tour", "free"]);
const OUTCOMES = new Set(["approved", "rejected", "more-information-required"]);

function optionalBoundedString(value: unknown, name: string, maximum: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`${name} must be a string`);
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximum) {
    throw new Error(`${name} must contain between 1 and ${String(maximum)} characters`);
  }
  return normalized;
}

export function parseProductAnalyticsEventName(value: unknown): ProductAnalyticsEventName {
  if (typeof value !== "string" || !EVENT_NAMES.has(value)) {
    throw new Error("Unknown product analytics event");
  }
  return value as ProductAnalyticsEventName;
}

/**
 * Analytics context is deliberately closed: arbitrary browser properties are
 * never retained, which keeps free-text and assessment PII out of event rows.
 */
export function parseProductAnalyticsEventContext(value: unknown): ProductAnalyticsEventContext {
  if (value === undefined) return {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Product analytics context must be an object");
  }
  const raw = value as Record<string, unknown>;
  const allowed = new Set(["path", "scenarioId", "lens", "subjectId", "entry", "outcome"]);
  if (Object.keys(raw).some((key) => !allowed.has(key))) {
    throw new Error("Product analytics context contains an unsupported property");
  }

  const path = optionalBoundedString(raw["path"], "Analytics path", 300);
  if (path !== undefined && (!path.startsWith("/") || path.includes("?") || path.includes("#"))) {
    throw new Error("Analytics path must be an application pathname without a query or fragment");
  }
  const scenarioId = optionalBoundedString(raw["scenarioId"], "Scenario ID", 120);
  const subjectId = optionalBoundedString(raw["subjectId"], "Subject ID", 160);
  const lens = optionalBoundedString(raw["lens"], "Lens", 32);
  const entry = optionalBoundedString(raw["entry"], "Entry", 16);
  const outcome = optionalBoundedString(raw["outcome"], "Outcome", 40);
  if (lens !== undefined && !LENSES.has(lens)) throw new Error("Unknown analytics lens");
  if (entry !== undefined && !ENTRIES.has(entry)) throw new Error("Unknown demo entry");
  if (outcome !== undefined && !OUTCOMES.has(outcome)) throw new Error("Unknown decision outcome");

  return {
    ...(path === undefined ? {} : { path }),
    ...(scenarioId === undefined ? {} : { scenarioId }),
    ...(subjectId === undefined ? {} : { subjectId }),
    ...(lens === undefined ? {} : { lens: lens as ProductAnalyticsEventContext["lens"] }),
    ...(entry === undefined ? {} : { entry: entry as ProductAnalyticsEventContext["entry"] }),
    ...(outcome === undefined ? {} : { outcome: outcome as ProductAnalyticsEventContext["outcome"] }),
  };
}

export class ProductAnalyticsService {
  private readonly clock: () => Date;
  private readonly createId: () => string;

  constructor(
    private readonly repository: ProductAnalyticsEventRepository,
    options: ProductAnalyticsServiceOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.createId = options.createId ?? randomUUID;
  }

  async record(input: {
    id?: string | undefined;
    workspaceId?: string | null | undefined;
    sessionId: string;
    name: unknown;
    context?: unknown;
  }): Promise<ProductAnalyticsEvent> {
    const sessionId = optionalBoundedString(input.sessionId, "Analytics session ID", 160);
    if (sessionId === undefined) throw new Error("Analytics session ID is required");
    const event: ProductAnalyticsEvent = {
      id: optionalBoundedString(input.id, "Analytics event ID", 160) ?? this.createId(),
      workspaceId: input.workspaceId ?? null,
      sessionId,
      name: parseProductAnalyticsEventName(input.name),
      context: parseProductAnalyticsEventContext(input.context),
      occurredAt: this.clock().toISOString(),
    };
    await this.repository.insert(event);
    return event;
  }
}
