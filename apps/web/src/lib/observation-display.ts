import type { Observation } from "@oiw/contracts";

import type { BadgeTone } from "@/components/ui/Badge";

/** Shared review-status → badge-tone mapping (Technical Inspector, Review Queue). Text label always accompanies tone (UX_SPEC §16.3: no colour-only state). */
export const REVIEW_STATUS_TONE: Record<Observation["reviewStatus"], BadgeTone> = {
  "not-required": "neutral",
  pending: "warn",
  accepted: "ok",
  corrected: "ok",
  rejected: "critical",
  conflicting: "critical",
};

export const REVIEW_STATUS_LABEL: Record<Observation["reviewStatus"], string> = {
  "not-required": "Not required",
  pending: "Pending review",
  accepted: "Accepted",
  corrected: "Corrected",
  rejected: "Rejected",
  conflicting: "Conflicting",
};

export function formatConfidence(confidence: number | null): string {
  return confidence === null ? "—" : `${Math.round(confidence * 100)}%`;
}
