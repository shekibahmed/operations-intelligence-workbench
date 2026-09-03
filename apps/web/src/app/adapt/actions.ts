"use server";

import {
  AssessmentSubmissionService,
  AssessmentValidationError,
  type AssessmentFieldErrors,
} from "@oiw/application";

import { assessmentSinkName, createAssessmentSink } from "@/lib/server/assessment-sink";
import { getOrCreateAnalyticsSessionId } from "@/lib/server/analytics-session";
import { buildAuditEntry } from "@/lib/server/audit";
import { getRepositories } from "@/lib/server/db";
import { findPackEntry } from "@/lib/server/pack-registry";
import {
  activeAnalyticsWorkspace,
  tryRecordProductAnalyticsEvent,
} from "@/lib/server/product-analytics";
import { toActionErrorMessage } from "@/lib/server/action-error";
import { enforceGuestRateLimit } from "@/lib/server/rate-limit";
import { readSessionPayload } from "@/lib/server/session";

export interface AssessmentFormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: AssessmentFieldErrors;
}

function formFields(formData: FormData): Record<string, unknown> {
  return {
    organisation: formData.get("organisation"),
    industry: formData.get("industry"),
    operationalWorkflow: formData.get("operationalWorkflow"),
    currentSourceSystems: formData.get("currentSourceSystems"),
    approximateInformationVolume: formData.get("approximateInformationVolume"),
    mainBottleneck: formData.get("mainBottleneck"),
    currentReportingMethod: formData.get("currentReportingMethod"),
    dataSensitivity: formData.get("dataSensitivity"),
    desiredResult: formData.get("desiredResult"),
    contactDetails: formData.get("contactDetails"),
    scenarioId: formData.get("scenarioId"),
  };
}

export async function submitAssessment(
  _previousState: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  try {
    const [workspace, analyticsSessionId, sessionPayload] = await Promise.all([
      activeAnalyticsWorkspace(),
      getOrCreateAnalyticsSessionId(),
      readSessionPayload(),
    ]);
    await enforceGuestRateLimit("assessment", workspace ?? undefined, 1, analyticsSessionId);

    const fields = formFields(formData);
    if (workspace?.activePackId !== null && workspace?.activePackId !== undefined) {
      fields["scenarioId"] = workspace.activePackId;
    } else if (typeof fields["scenarioId"] === "string" && fields["scenarioId"].trim().length > 0) {
      const scenarioId = fields["scenarioId"].trim();
      if ((await findPackEntry(scenarioId)) === undefined) {
        return {
          status: "error",
          message: "Check the highlighted field and try again.",
          fieldErrors: { scenarioId: "Select a valid scenario." },
        };
      }
      fields["scenarioId"] = scenarioId;
    }

    const sink = assessmentSinkName();
    const submission = await new AssessmentSubmissionService(createAssessmentSink(sink)).submit({
      fields,
      workspaceId: workspace?.id ?? null,
      sessionId: analyticsSessionId,
    });

    if (workspace !== null) {
      const repositories = getRepositories();
      const audit = await buildAuditEntry(repositories, {
        workspaceId: workspace.id,
        occurredAt: submission.submittedAt,
        action: "assessment-submitted",
        actor: { type: "human", id: sessionPayload?.sessionId ?? analyticsSessionId },
        subject: { type: "assessment-submission", id: submission.id },
        cause: "Visitor submitted the contextual workflow assessment form",
        data: { scenarioId: submission.scenarioId, sink },
      });
      await repositories.auditEntries.insert(workspace.id, audit);
    }

    await tryRecordProductAnalyticsEvent({
      workspace,
      sessionId: analyticsSessionId,
      name: "assessment-submitted",
      context: {
        ...(submission.scenarioId === null ? {} : { scenarioId: submission.scenarioId }),
        subjectId: submission.id,
      },
    });
    return { status: "success", message: "Assessment submitted.", fieldErrors: {} };
  } catch (error) {
    if (error instanceof AssessmentValidationError) {
      return {
        status: "error",
        message: "Check the highlighted fields and try again.",
        fieldErrors: error.fieldErrors,
      };
    }
    return {
      status: "error",
      message: toActionErrorMessage(
        error,
        "Submission failed. Your entered values have been kept — please try again.",
      ),
      fieldErrors: {},
    };
  }
}
