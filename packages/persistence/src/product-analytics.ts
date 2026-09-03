import { asc, count, desc, eq } from "drizzle-orm";

import type { PersistenceDatabase } from "./database.js";
import { analyticsEvents, assessmentSubmissions } from "./schema.js";

export interface StoredAnalyticsEvent {
  id: string;
  workspaceId: string | null;
  sessionId: string;
  name: string;
  context: unknown;
  occurredAt: string;
}

export interface StoredAssessmentSubmission {
  id: string;
  workspaceId: string | null;
  sessionId: string;
  organisation: string;
  industry: string;
  operationalWorkflow: string;
  currentSourceSystems: string | null;
  approximateInformationVolume: string | null;
  mainBottleneck: string;
  currentReportingMethod: string | null;
  dataSensitivity: string | null;
  desiredResult: string;
  contactDetails: string;
  scenarioId: string | null;
  submittedAt: string;
}

export interface AnalyticsSummary {
  totalEvents: number;
  events: Array<{ name: string; count: number }>;
  assessmentSubmissions: number;
}

function normalizeEvent(row: typeof analyticsEvents.$inferSelect): StoredAnalyticsEvent {
  return { ...row, occurredAt: new Date(row.occurredAt).toISOString() };
}

function normalizeSubmission(
  row: typeof assessmentSubmissions.$inferSelect,
): StoredAssessmentSubmission {
  return { ...row, submittedAt: new Date(row.submittedAt).toISOString() };
}

export function createProductAnalyticsRepository(database: PersistenceDatabase) {
  return {
    async insert(event: StoredAnalyticsEvent): Promise<boolean> {
      const rows = await database
        .insert(analyticsEvents)
        .values(event)
        .onConflictDoNothing({ target: analyticsEvents.id })
        .returning({ id: analyticsEvents.id });
      return rows.length === 1;
    },

    async listByWorkspace(workspaceId: string): Promise<StoredAnalyticsEvent[]> {
      const rows = await database
        .select()
        .from(analyticsEvents)
        .where(eq(analyticsEvents.workspaceId, workspaceId))
        .orderBy(asc(analyticsEvents.occurredAt), asc(analyticsEvents.id));
      return rows.map(normalizeEvent);
    },

    async listBySession(sessionId: string): Promise<StoredAnalyticsEvent[]> {
      const rows = await database
        .select()
        .from(analyticsEvents)
        .where(eq(analyticsEvents.sessionId, sessionId))
        .orderBy(asc(analyticsEvents.occurredAt), asc(analyticsEvents.id));
      return rows.map(normalizeEvent);
    },

    async summary(): Promise<AnalyticsSummary> {
      const [totals, grouped, submissions] = await Promise.all([
        database.select({ count: count() }).from(analyticsEvents),
        database
          .select({ name: analyticsEvents.name, count: count() })
          .from(analyticsEvents)
          .groupBy(analyticsEvents.name)
          .orderBy(desc(count()), asc(analyticsEvents.name)),
        database.select({ count: count() }).from(assessmentSubmissions),
      ]);
      return {
        totalEvents: totals[0]?.count ?? 0,
        events: grouped,
        assessmentSubmissions: submissions[0]?.count ?? 0,
      };
    },
  };
}

export function createAssessmentSubmissionRepository(database: PersistenceDatabase) {
  return {
    async insert(submission: StoredAssessmentSubmission): Promise<StoredAssessmentSubmission> {
      const rows = await database.insert(assessmentSubmissions).values(submission).returning();
      const row = rows[0];
      if (row === undefined) throw new Error("Assessment submission was not persisted");
      return normalizeSubmission(row);
    },

    async listByWorkspace(workspaceId: string): Promise<StoredAssessmentSubmission[]> {
      const rows = await database
        .select()
        .from(assessmentSubmissions)
        .where(eq(assessmentSubmissions.workspaceId, workspaceId))
        .orderBy(asc(assessmentSubmissions.submittedAt), asc(assessmentSubmissions.id));
      return rows.map(normalizeSubmission);
    },
  };
}
