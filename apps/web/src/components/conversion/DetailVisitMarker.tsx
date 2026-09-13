"use client";

import { useEffect } from "react";

export const DETAIL_VISIT_STORAGE_KEY = "oiw-visited-detail";

/**
 * Session-local detail-visit signal (value-traction plan U3, UX_SPEC §9):
 * records that the visitor opened a case detail or decision view, so the
 * overview can progressively disclose a contextual call to action. No
 * tracking dependency — sessionStorage only, never sent anywhere.
 */
export function DetailVisitMarker() {
  useEffect(() => {
    try {
      window.sessionStorage.setItem(DETAIL_VISIT_STORAGE_KEY, "1");
    } catch {
      // sessionStorage unavailable — the contextual banner simply won't show.
    }
  }, []);
  return null;
}
