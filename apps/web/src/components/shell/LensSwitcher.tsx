"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { LENS_COOKIE, LENS_LABEL, LENSES } from "@/lib/lens";
import type { Lens } from "@/lib/lens";

/**
 * Segmented control: Leadership / Operations / Technical (UX_SPEC §1.2). A
 * lens change re-renders the current route in place — same pathname, only
 * the `lens` query param changes, `scroll: false` so switching lenses never
 * jumps the visitor back to the top of a long screen.
 */
export function LensSwitcher({ activeLens }: { activeLens: Lens }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectLens(lens: Lens) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lens", lens);
    document.cookie = `${LENS_COOKIE}=${lens}; path=/; max-age=86400; SameSite=Lax`;
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div role="radiogroup" aria-label="Lens" className="inline-flex rounded-md border border-border p-0.5">
      {LENSES.map((lens) => (
        <button
          key={lens}
          type="button"
          role="radio"
          aria-checked={lens === activeLens}
          onClick={() => selectLens(lens)}
          className={`rounded px-3 py-1 text-sm font-medium transition ${
            lens === activeLens ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "text-ink-muted hover:text-ink"
          }`}
        >
          {LENS_LABEL[lens]}
        </button>
      ))}
    </div>
  );
}
