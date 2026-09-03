import { LogSubmissionSink, PostgresSubmissionSink, type SubmissionSink } from "@oiw/application";
import { createAssessmentSubmissionRepository } from "@oiw/persistence";

import { getPersistenceDatabase } from "@/lib/server/db";

export type AssessmentSinkName = "postgres" | "log";

export function assessmentSinkName(value = process.env.OIW_ASSESSMENT_SINK): AssessmentSinkName {
  const normalized = value?.trim();
  if (normalized === undefined || normalized === "" || normalized === "postgres") return "postgres";
  if (normalized === "log") return "log";
  throw new Error("OIW_ASSESSMENT_SINK must be postgres or log");
}

export function createAssessmentSink(name = assessmentSinkName()): SubmissionSink {
  return name === "postgres"
    ? new PostgresSubmissionSink(createAssessmentSubmissionRepository(getPersistenceDatabase()))
    : new LogSubmissionSink();
}
