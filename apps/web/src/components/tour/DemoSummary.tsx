"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { getTourSteps } from "@/lib/tour/steps";

const TOUR_STORAGE_KEY = "oiw-tour-state";

export interface DemoSummaryData {
  packName: string;
  scenarioId: string;
  entry: "Guided tour" | "Free exploration";
  progress: string;
}

/**
 * Stateless demo takeaway (value-traction plan U2): a copyable summary of
 * the visitor's session built entirely client-side from props plus tour
 * state — no new server state, no share-token table, no guard change. The
 * synthetic-data footer keeps it honest when forwarded to a colleague.
 */
export function buildDemoSummaryText(summary: DemoSummaryData): string {
  return [
    `Demo summary — ${summary.packName}`,
    `Scenario: ${summary.scenarioId}`,
    `Entry: ${summary.entry}`,
    `Progress: ${summary.progress}`,
    "",
    "Synthetic demo data — nothing here is a real operational record.",
  ].join("\n");
}

export function DemoSummary({ packName, scenarioId }: { packName: string; scenarioId: string }) {
  const [summary, setSummary] = useState<DemoSummaryData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const startedWithTour = new URLSearchParams(window.location.search).get("tour") === "1";
    let stored: { active?: unknown; index?: unknown } | null = null;
    try {
      const raw = window.sessionStorage.getItem(TOUR_STORAGE_KEY);
      stored = raw === null ? null : (JSON.parse(raw) as { active?: unknown; index?: unknown });
    } catch {
      stored = null;
    }
    const steps = getTourSteps(scenarioId);
    const entry = startedWithTour || stored !== null ? "Guided tour" : "Free exploration";
    const progress =
      steps === undefined || typeof stored?.index !== "number"
        ? entry === "Free exploration"
          ? "Exploring freely"
          : "Tour not started yet"
        : `Step ${Math.min(stored.index + 1, steps.length)} of ${steps.length}`;
    setSummary({ packName, scenarioId, entry, progress });
  }, [packName, scenarioId]);

  if (summary === null) return null;
  const text = buildDemoSummaryText(summary);

  return (
    <section aria-labelledby="demo-summary-heading" className="rounded-lg border border-border bg-surface p-4">
      <h2 id="demo-summary-heading" className="text-sm font-semibold text-ink">
        Demo summary
      </h2>
      <dl className="mt-2 space-y-1 text-sm text-ink-muted">
        <div className="flex gap-2">
          <dt className="font-medium text-ink">Scenario:</dt>
          <dd>{summary.packName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-ink">Entry:</dt>
          <dd>{summary.entry}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-ink">Progress:</dt>
          <dd>{summary.progress}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-ink-muted">Synthetic demo data — nothing here is a real operational record.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? "Copied" : "Copy summary"}
        </Button>
        <Link
          href={`/adapt?scenario=${encodeURIComponent(scenarioId)}`}
          className="font-medium text-[var(--color-accent)] underline text-sm self-center"
        >
          Discuss this workflow
          <span className="sr-only"> (goes to the assessment form, prefilled for {summary.packName})</span>
        </Link>
      </div>
    </section>
  );
}
