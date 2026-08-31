import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LENS_COOKIE, defaultLensForSection, isLens } from "@/lib/lens";
import type { Lens, WorkspaceSection } from "@/lib/lens";

export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Resolves the active lens for a `/w/[workspace]/*` request per UX_SPEC
 * §1.3: use `?lens=` if present and valid, otherwise redirect to the
 * section's default (or, for Decisions, the last lens recorded in
 * `oiw-last-lens`, falling back to leadership).
 */
export async function resolveLens(
  section: WorkspaceSection,
  path: string,
  searchParams: RawSearchParams,
): Promise<Lens> {
  const rawLens = searchParams.lens;
  const requested = Array.isArray(rawLens) ? rawLens[0] : rawLens;
  if (isLens(requested)) {
    return requested;
  }

  const fallback = defaultLensForSection(section);
  let lens: Lens;
  if (fallback !== null) {
    lens = fallback;
  } else {
    const store = await cookies();
    const lastLens = store.get(LENS_COOKIE)?.value;
    lens = isLens(lastLens) ? lastLens : "leadership";
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "lens" || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }
  params.set("lens", lens);
  redirect(`${path}?${params.toString()}`);
}
