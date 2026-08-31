"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";

const FIELDS = [
  { name: "organisation", label: "Organisation", type: "text", required: true },
  { name: "industry", label: "Industry", type: "text", required: true },
  { name: "workflow", label: "Operational workflow", type: "text", required: true },
  { name: "sourceSystems", label: "Current source systems", type: "text", required: false },
  { name: "volume", label: "Approximate information volume", type: "text", required: false },
  { name: "bottleneck", label: "Main bottleneck", type: "text", required: true },
  { name: "reportingMethod", label: "Current reporting method", type: "text", required: false },
  { name: "dataSensitivity", label: "Data sensitivity", type: "text", required: false },
  { name: "desiredResult", label: "Desired result", type: "text", required: true },
  { name: "contact", label: "Contact details", type: "text", required: true },
  { name: "scenario", label: "Scenario being viewed", type: "text", required: false },
] as const;

/**
 * Form fields per PRD §23.2. Submission has no real backend in Wave 1
 * (non-goal); this simulates the default/submitting/success/error states
 * UX_SPEC §5.15 requires, with no event tracking (amendment A7).
 */
export function AdaptForm({ scenario, forcedState }: { scenario: string; forcedState?: "submitting" | "error" | undefined }) {
  const formId = useId();
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const effectiveStatus = forcedState ?? status;

  if (effectiveStatus === "success") {
    return (
      <div role="status" className="rounded-md border border-border bg-surface p-4 text-sm">
        <p className="font-medium text-ink">Thanks — we&apos;ll follow up shortly.</p>
        <p className="mt-1 text-ink-muted">You&apos;re welcome to keep exploring the demonstration.</p>
      </div>
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextErrors: Record<string, string> = {};
    for (const field of FIELDS) {
      if (field.required && !String(data.get(field.name) ?? "").trim()) {
        nextErrors[field.name] = `${field.label} is required.`;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("submitting");
    window.setTimeout(() => {
      setStatus("success");
    }, 400);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {effectiveStatus === "error" ? (
        <p role="alert" className="mb-4 rounded-md border border-[var(--color-critical-ink)] bg-[var(--color-critical-surface)] p-3 text-sm text-[var(--color-critical-ink)]">
          Submission failed. Your entered values have been kept — please try again.
        </p>
      ) : null}
      <div className="flex flex-col gap-4">
        {FIELDS.map((field) => {
          const fieldId = `${formId}-${field.name}`;
          const errorId = `${fieldId}-error`;
          return (
            <div key={field.name}>
              <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
                {field.label} {field.required ? <span>(required)</span> : null}
              </label>
              <input
                id={fieldId}
                name={field.name}
                type="text"
                defaultValue={field.name === "scenario" ? scenario : undefined}
                aria-describedby={errors[field.name] ? errorId : undefined}
                aria-invalid={errors[field.name] ? true : undefined}
                className="mt-1 w-full rounded-md border border-border p-2 text-sm"
              />
              {errors[field.name] ? (
                <p id={errorId} className="mt-1 text-xs text-[var(--color-critical-ink)]">
                  {errors[field.name]}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <Button variant="primary" type="submit" className="mt-6" disabled={effectiveStatus === "submitting"}>
        {effectiveStatus === "submitting" ? "Submitting…" : "Submit"}
      </Button>
    </form>
  );
}
