"use client";

import { useEffect } from "react";

import { LENS_COOKIE } from "@/lib/lens";
import type { Lens } from "@/lib/lens";

/**
 * Keeps `oiw-last-lens` current on every workspace page visit (not just
 * explicit switcher clicks) so Decision Centre's "previous lens" default
 * (UX_SPEC §1.3) reflects the lens a visitor actually arrived from.
 */
export function LensCookieSync({ lens }: { lens: Lens }) {
  useEffect(() => {
    document.cookie = `${LENS_COOKIE}=${lens}; path=/; max-age=86400; SameSite=Lax`;
  }, [lens]);
  return null;
}
