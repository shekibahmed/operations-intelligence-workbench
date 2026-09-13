"use client";

import { useEffect, useState } from "react";

import { AdaptCta } from "@/components/shell/AdaptCta";
import { DETAIL_VISIT_STORAGE_KEY } from "@/components/conversion/DetailVisitMarker";

/**
 * Contextual call to action (value-traction plan U3, UX_SPEC §9): an
 * engaged-visitor banner on the overview that appears only after the
 * session-local detail-visit signal is set. Reuses the existing Adapt CTA
 * with the same scenario prefill — no new event, no permission change.
 */
export function EngagedAdaptBanner({ scenario, packName }: { scenario: string; packName: string }) {
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    try {
      setEngaged(window.sessionStorage.getItem(DETAIL_VISIT_STORAGE_KEY) === "1");
    } catch {
      setEngaged(false);
    }
  }, []);

  if (!engaged) return null;

  return (
    <section aria-labelledby="engaged-cta-heading" className="rounded-lg border border-border bg-surface p-4">
      <h2 id="engaged-cta-heading" className="text-sm font-semibold text-ink">
        You&apos;ve seen the evidence — see it applied
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        You looked inside {packName}. Tell us about one workflow where information gets lost, and we&apos;ll map
        what a pilot could cover.
      </p>
      <div className="mt-3">
        <AdaptCta scenario={scenario} variant="primary" />
      </div>
    </section>
  );
}
