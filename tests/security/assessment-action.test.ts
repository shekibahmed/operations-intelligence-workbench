import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AssessmentSubmission } from "@oiw/application";
import type { AuditEntry, Workspace } from "@oiw/contracts";

const mocks = vi.hoisted(() => ({
  activeAnalyticsWorkspace: vi.fn(),
  analyticsSession: vi.fn(),
  assessmentSinkName: vi.fn(),
  auditInsert: vi.fn(),
  buildAuditEntry: vi.fn(),
  enforceGuestRateLimit: vi.fn(),
  findPackEntry: vi.fn(),
  readSessionPayload: vi.fn(),
  sinkSubmit: vi.fn(),
  tryRecordProductAnalyticsEvent: vi.fn(),
}));

vi.mock("@/lib/server/assessment-sink", () => ({
  assessmentSinkName: () => mocks.assessmentSinkName(),
  createAssessmentSink: () => ({ submit: (submission: AssessmentSubmission) => mocks.sinkSubmit(submission) }),
}));
vi.mock("@/lib/server/analytics-session", () => ({
  getOrCreateAnalyticsSessionId: () => mocks.analyticsSession(),
}));
vi.mock("@/lib/server/audit", () => ({
  buildAuditEntry: (...args: unknown[]) => mocks.buildAuditEntry(...args),
}));
vi.mock("@/lib/server/db", () => ({
  getRepositories: () => ({
    auditEntries: { insert: (...args: unknown[]) => mocks.auditInsert(...args), list: async () => [] },
  }),
}));
vi.mock("@/lib/server/pack-registry", () => ({
  findPackEntry: (...args: unknown[]) => mocks.findPackEntry(...args),
}));
vi.mock("@/lib/server/product-analytics", () => ({
  activeAnalyticsWorkspace: () => mocks.activeAnalyticsWorkspace(),
  tryRecordProductAnalyticsEvent: (...args: unknown[]) => mocks.tryRecordProductAnalyticsEvent(...args),
}));
vi.mock("@/lib/server/rate-limit", () => ({
  enforceGuestRateLimit: (...args: unknown[]) => mocks.enforceGuestRateLimit(...args),
}));
vi.mock("@/lib/server/session", () => ({
  readSessionPayload: () => mocks.readSessionPayload(),
}));

const { submitAssessment } = await import("@/app/adapt/actions");
const { UserFacingActionError } = await import("@/lib/server/action-error");
const INITIAL_ASSESSMENT_FORM_STATE = { status: "idle" as const, message: "", fieldErrors: {} };

const workspace: Workspace = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Synthetic workspace",
  slug: "synthetic-workspace",
  activePackId: "example-pack",
  mode: "public-demo",
  createdAt: "2026-09-03T08:00:00.000Z",
  resetAt: null,
  expiresAt: "2099-09-03T08:00:00.000Z",
};

function validForm(): FormData {
  const form = new FormData();
  form.set("organisation", "Example Operations");
  form.set("industry", "Cross-sector");
  form.set("operationalWorkflow", "Exception intake and review");
  form.set("currentSourceSystems", "Email");
  form.set("approximateInformationVolume", "100 weekly");
  form.set("mainBottleneck", "Manual triage");
  form.set("currentReportingMethod", "Weekly report");
  form.set("dataSensitivity", "Internal");
  form.set("desiredResult", "Accountable follow-up");
  form.set("contactDetails", "person@example.test");
  form.set("scenarioId", "forged-other-pack");
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.activeAnalyticsWorkspace.mockResolvedValue(workspace);
  mocks.analyticsSession.mockResolvedValue("22222222-2222-4222-8222-222222222222");
  mocks.assessmentSinkName.mockReturnValue("postgres");
  mocks.enforceGuestRateLimit.mockResolvedValue(undefined);
  mocks.readSessionPayload.mockResolvedValue({ sessionId: "33333333-3333-4333-8333-333333333333" });
  mocks.sinkSubmit.mockResolvedValue(undefined);
  mocks.tryRecordProductAnalyticsEvent.mockResolvedValue(undefined);
  mocks.buildAuditEntry.mockImplementation(async (_repositories: unknown, input: Record<string, unknown>) => ({
    id: "44444444-4444-4444-8444-444444444444",
    workspaceId: workspace.id,
    occurredAt: "2026-09-03T08:00:00.000Z",
    action: "assessment-submitted",
    actor: { type: "human", id: "33333333-3333-4333-8333-333333333333" },
    subject: input["subject"],
    cause: "submitted",
    data: input["data"],
    previousEntryHash: null,
    entryHash: "a".repeat(64),
  } satisfies AuditEntry));
  mocks.auditInsert.mockImplementation(async (_workspaceId: string, entry: AuditEntry) => entry);
});

describe("assessment Server Action security boundary", () => {
  it("derives Workspace/scenario scope server-side and keeps form PII out of audit and analytics context", async () => {
    const result = await submitAssessment(INITIAL_ASSESSMENT_FORM_STATE, validForm());

    expect(result.status).toBe("success");
    const submission = mocks.sinkSubmit.mock.calls[0]?.[0] as AssessmentSubmission;
    expect(submission).toMatchObject({ workspaceId: workspace.id, scenarioId: "example-pack" });
    expect(submission.scenarioId).not.toBe("forged-other-pack");
    const auditInput = mocks.buildAuditEntry.mock.calls[0]?.[1];
    expect(auditInput).toMatchObject({ data: { scenarioId: "example-pack", sink: "postgres" } });
    expect(JSON.stringify(auditInput)).not.toContain("person@example.test");
    expect(JSON.stringify(mocks.tryRecordProductAnalyticsEvent.mock.calls)).not.toContain("person@example.test");
  });

  it("performs no submission or audit write when rate-limited", async () => {
    mocks.enforceGuestRateLimit.mockRejectedValueOnce(
      Object.assign(new UserFacingActionError("Too many requests. Try again in 60 seconds."), {
        status: 429 as const,
        retryAfterSeconds: 60,
      }),
    );

    const result = await submitAssessment(INITIAL_ASSESSMENT_FORM_STATE, validForm());

    expect(result.status).toBe("error");
    expect(mocks.sinkSubmit).not.toHaveBeenCalled();
    expect(mocks.auditInsert).not.toHaveBeenCalled();
  });
});
