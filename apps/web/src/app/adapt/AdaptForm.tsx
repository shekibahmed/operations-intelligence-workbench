"use client";

import { useActionState, useId } from "react";

import {
  submitAssessment,
  type AssessmentFormState,
} from "@/app/adapt/actions";
import { Button } from "@/components/ui/Button";
import { FIRM } from "@/lib/firm";

const INITIAL_ASSESSMENT_FORM_STATE: AssessmentFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

const FIELDS = [
  { name: "organisation", label: "Organisation", type: "text", required: true },
  { name: "industry", label: "Industry", type: "text", required: true },
  { name: "operationalWorkflow", label: "Operational workflow", type: "text", required: true },
  { name: "currentSourceSystems", label: "Current source systems", type: "text", required: false },
  { name: "approximateInformationVolume", label: "Approximate information volume", type: "text", required: false },
  { name: "mainBottleneck", label: "Main bottleneck", type: "text", required: true },
  { name: "currentReportingMethod", label: "Current reporting method", type: "text", required: false },
  { name: "dataSensitivity", label: "Data sensitivity", type: "text", required: false },
  { name: "desiredResult", label: "Desired result", type: "text", required: true },
  { name: "contactDetails", label: "Contact details", type: "text", required: true },
] as const;

export function AdaptForm({
  scenario,
  scenarioOptions,
  forcedState,
}: {
  scenario: string;
  scenarioOptions: Array<{ id: string; name: string }>;
  forcedState?: "submitting" | "error" | undefined;
}) {
  const formId = useId();
  const [state, formAction, pending] = useActionState(submitAssessment, INITIAL_ASSESSMENT_FORM_STATE);
  const effectiveStatus = forcedState ?? (pending ? "submitting" : state.status);

  if (effectiveStatus === "success") {
    return (
      <div role="status" className="rounded-md border border-border bg-surface p-4 text-sm">
        <p className="font-medium text-ink">Thanks — we&apos;ll follow up shortly.</p>
        <p className="mt-1 text-ink-muted">You&apos;re welcome to keep exploring the demonstration.</p>
        <p className="mt-2 text-ink-muted">
          In a hurry? Email{" "}
          <a href={`mailto:${FIRM.email}`} className="text-ink underline">
            {FIRM.email}
          </a>{" "}
          — it comes straight to the team that built this.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate>
      {effectiveStatus === "error" ? (
        <p role="alert" className="mb-4 rounded-md border border-[var(--color-critical-ink)] bg-[var(--color-critical-surface)] p-3 text-sm text-[var(--color-critical-ink)]">
          {forcedState === "error"
            ? "Submission failed. Your entered values have been kept — please try again."
            : state.message}
        </p>
      ) : null}
      <div className="flex flex-col gap-4">
        {FIELDS.map((field) => {
          const fieldId = `${formId}-${field.name}`;
          const errorId = `${fieldId}-error`;
          const error = state.fieldErrors[field.name];
          return (
            <div key={field.name}>
              <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
                {field.label} {field.required ? <span>(required)</span> : null}
              </label>
              <input
                id={fieldId}
                name={field.name}
                type="text"
                required={field.required}
                disabled={effectiveStatus === "submitting"}
                aria-describedby={error ? errorId : undefined}
                aria-invalid={error ? true : undefined}
                className="mt-1 w-full rounded-md border border-border p-2 text-sm"
              />
              {error ? (
                <p id={errorId} className="mt-1 text-xs text-[var(--color-critical-ink)]">
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
        <div>
          <label htmlFor={`${formId}-scenarioId`} className="block text-sm font-medium text-ink">
            Scenario being viewed
          </label>
          <select
            id={`${formId}-scenarioId`}
            name="scenarioId"
            defaultValue={scenario}
            disabled={effectiveStatus === "submitting"}
            aria-describedby={state.fieldErrors.scenarioId ? `${formId}-scenarioId-error` : undefined}
            aria-invalid={state.fieldErrors.scenarioId ? true : undefined}
            className="mt-1 w-full rounded-md border border-border p-2 text-sm"
          >
            <option value="">No scenario selected</option>
            {scenarioOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
          {state.fieldErrors.scenarioId ? (
            <p id={`${formId}-scenarioId-error`} className="mt-1 text-xs text-[var(--color-critical-ink)]">
              {state.fieldErrors.scenarioId}
            </p>
          ) : null}
        </div>
      </div>
      <Button variant="primary" type="submit" className="mt-6" disabled={effectiveStatus === "submitting"}>
        {effectiveStatus === "submitting" ? "Submitting…" : "Submit"}
      </Button>
    </form>
  );
}
