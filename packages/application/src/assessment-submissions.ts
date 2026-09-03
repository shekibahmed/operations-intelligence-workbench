import { randomUUID } from "node:crypto";

export interface AssessmentInput {
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
}

export interface AssessmentSubmission extends AssessmentInput {
  id: string;
  workspaceId: string | null;
  sessionId: string;
  submittedAt: string;
}

export interface AssessmentSubmissionRepository {
  insert(submission: AssessmentSubmission): Promise<AssessmentSubmission>;
}

export interface SubmissionSink {
  submit(submission: AssessmentSubmission): Promise<void>;
}

/** Future destination contract only; OIW-904 performs no email delivery. */
export interface EmailSubmissionSink extends SubmissionSink {
  readonly kind: "email";
}

/** Future destination contract only; OIW-904 performs no outbound webhook. */
export interface WebhookSubmissionSink extends SubmissionSink {
  readonly kind: "webhook";
}

export interface AssessmentSubmissionServiceOptions {
  clock?: () => Date;
  createId?: () => string;
}

export type AssessmentFieldErrors = Partial<Record<keyof AssessmentInput, string>>;

export class AssessmentValidationError extends Error {
  constructor(readonly fieldErrors: AssessmentFieldErrors) {
    super("Assessment submission is invalid");
    this.name = "AssessmentValidationError";
  }
}

const LIMITS: Record<keyof AssessmentInput, number> = {
  organisation: 200,
  industry: 120,
  operationalWorkflow: 2_000,
  currentSourceSystems: 2_000,
  approximateInformationVolume: 500,
  mainBottleneck: 4_000,
  currentReportingMethod: 2_000,
  dataSensitivity: 1_000,
  desiredResult: 4_000,
  contactDetails: 500,
  scenarioId: 120,
};

const REQUIRED_FIELDS = new Set<keyof AssessmentInput>([
  "organisation",
  "industry",
  "operationalWorkflow",
  "mainBottleneck",
  "desiredResult",
  "contactDetails",
]);

function normalizeField(
  raw: unknown,
  field: keyof AssessmentInput,
  errors: AssessmentFieldErrors,
): string | null {
  if (typeof raw !== "string") {
    if (REQUIRED_FIELDS.has(field)) errors[field] = "This field is required.";
    return null;
  }
  const value = raw.replaceAll("\r\n", "\n").trim();
  if (value.length === 0) {
    if (REQUIRED_FIELDS.has(field)) errors[field] = "This field is required.";
    return null;
  }
  if (value.length > LIMITS[field]) {
    errors[field] = `Enter ${String(LIMITS[field])} characters or fewer.`;
    return null;
  }
  return value;
}

export function validateAssessmentInput(raw: Record<string, unknown>): AssessmentInput {
  const errors: AssessmentFieldErrors = {};
  const organisation = normalizeField(raw["organisation"], "organisation", errors);
  const industry = normalizeField(raw["industry"], "industry", errors);
  const operationalWorkflow = normalizeField(raw["operationalWorkflow"], "operationalWorkflow", errors);
  const currentSourceSystems = normalizeField(raw["currentSourceSystems"], "currentSourceSystems", errors);
  const approximateInformationVolume = normalizeField(
    raw["approximateInformationVolume"],
    "approximateInformationVolume",
    errors,
  );
  const mainBottleneck = normalizeField(raw["mainBottleneck"], "mainBottleneck", errors);
  const currentReportingMethod = normalizeField(raw["currentReportingMethod"], "currentReportingMethod", errors);
  const dataSensitivity = normalizeField(raw["dataSensitivity"], "dataSensitivity", errors);
  const desiredResult = normalizeField(raw["desiredResult"], "desiredResult", errors);
  const contactDetails = normalizeField(raw["contactDetails"], "contactDetails", errors);
  const scenarioId = normalizeField(raw["scenarioId"], "scenarioId", errors);

  if (Object.keys(errors).length > 0) throw new AssessmentValidationError(errors);
  return {
    organisation: organisation!,
    industry: industry!,
    operationalWorkflow: operationalWorkflow!,
    currentSourceSystems,
    approximateInformationVolume,
    mainBottleneck: mainBottleneck!,
    currentReportingMethod,
    dataSensitivity,
    desiredResult: desiredResult!,
    contactDetails: contactDetails!,
    scenarioId,
  };
}

export class PostgresSubmissionSink implements SubmissionSink {
  constructor(private readonly repository: AssessmentSubmissionRepository) {}

  async submit(submission: AssessmentSubmission): Promise<void> {
    await this.repository.insert(submission);
  }
}

export interface AssessmentLogWriter {
  info(message: string, submission: AssessmentSubmission): void;
}

export class LogSubmissionSink implements SubmissionSink {
  constructor(private readonly writer: AssessmentLogWriter = console) {}

  async submit(submission: AssessmentSubmission): Promise<void> {
    this.writer.info("Assessment submission", submission);
  }
}

export class AssessmentSubmissionService {
  private readonly clock: () => Date;
  private readonly createId: () => string;

  constructor(
    private readonly sink: SubmissionSink,
    options: AssessmentSubmissionServiceOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.createId = options.createId ?? randomUUID;
  }

  async submit(input: {
    fields: Record<string, unknown>;
    workspaceId?: string | null | undefined;
    sessionId: string;
  }): Promise<AssessmentSubmission> {
    const sessionId = input.sessionId.trim();
    if (sessionId.length === 0 || sessionId.length > 160) {
      throw new Error("Assessment submission requires a valid session ID");
    }
    const submission: AssessmentSubmission = {
      id: this.createId(),
      workspaceId: input.workspaceId ?? null,
      sessionId,
      ...validateAssessmentInput(input.fields),
      submittedAt: this.clock().toISOString(),
    };
    await this.sink.submit(submission);
    return submission;
  }
}
