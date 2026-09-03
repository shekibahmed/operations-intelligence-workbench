import { describe, expect, it, vi } from "vitest";

import {
  AssessmentSubmissionService,
  AssessmentValidationError,
  LogSubmissionSink,
  PostgresSubmissionSink,
  type AssessmentSubmission,
} from "../src/index.js";

const validFields = {
  organisation: "Example Operations",
  industry: "Cross-sector",
  operationalWorkflow: "Exception intake and review",
  currentSourceSystems: "Email and spreadsheets",
  approximateInformationVolume: "About 100 records per week",
  mainBottleneck: "Manual triage",
  currentReportingMethod: "Weekly report",
  dataSensitivity: "Internal",
  desiredResult: "Faster accountable follow-up",
  contactDetails: "person@example.test",
  scenarioId: "example-pack",
};

describe("AssessmentSubmissionService", () => {
  it("validates, normalizes and submits all PRD section 23.2 fields", async () => {
    const submitted: AssessmentSubmission[] = [];
    const service = new AssessmentSubmissionService(
      { submit: async (submission) => void submitted.push(submission) },
      {
        clock: () => new Date("2026-09-03T09:00:00.000Z"),
        createId: () => "submission-1",
      },
    );

    const result = await service.submit({
      fields: { ...validFields, organisation: "  Example Operations  " },
      workspaceId: "workspace-1",
      sessionId: "session-1",
    });

    expect(result).toMatchObject({
      id: "submission-1",
      organisation: "Example Operations",
      workspaceId: "workspace-1",
      scenarioId: "example-pack",
      submittedAt: "2026-09-03T09:00:00.000Z",
    });
    expect(submitted).toEqual([result]);
  });

  it("returns precise errors and never calls the sink for invalid input", async () => {
    const submit = vi.fn();
    const service = new AssessmentSubmissionService({ submit });

    const error = await service
      .submit({ fields: { ...validFields, organisation: "", contactDetails: "" }, sessionId: "session-1" })
      .catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(AssessmentValidationError);
    expect((error as AssessmentValidationError).fieldErrors).toMatchObject({
      organisation: "This field is required.",
      contactDetails: "This field is required.",
    });
    expect(submit).not.toHaveBeenCalled();
  });

  it("provides postgres and deliberate log sink adapters without outbound delivery", async () => {
    const repositoryInsert = vi.fn(async (submission: AssessmentSubmission) => submission);
    const log = vi.fn();
    const submission = {
      ...validFields,
      id: "submission-1",
      workspaceId: null,
      sessionId: "session-1",
      submittedAt: "2026-09-03T09:00:00.000Z",
    };

    await new PostgresSubmissionSink({ insert: repositoryInsert }).submit(submission);
    await new LogSubmissionSink({ info: log }).submit(submission);

    expect(repositoryInsert).toHaveBeenCalledWith(submission);
    expect(log).toHaveBeenCalledWith("Assessment submission", submission);
  });
});
