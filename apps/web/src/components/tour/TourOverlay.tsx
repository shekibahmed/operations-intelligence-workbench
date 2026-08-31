"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { processFixtureArtifacts } from "@/app/w/[workspace]/inbox/actions";
import { TOUR_PACK_ID, TOUR_STEPS } from "@/lib/tour/steps";
import { withLens } from "@/lib/routes";

const STORAGE_KEY = "oiw-tour-state";
const RELATED_FIXTURE_IDS = [
  "asset-reliability-demo-002",
  "asset-reliability-demo-003",
  "asset-reliability-demo-004",
  "asset-reliability-demo-005",
];
const LAST_INDEX = TOUR_STEPS.length - 1;

interface StoredTourState {
  active: boolean;
  index: number;
}

function readStoredState(): StoredTourState | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<StoredTourState>;
    return typeof parsed.active === "boolean" && typeof parsed.index === "number" ? (parsed as StoredTourState) : null;
  } catch {
    return null;
  }
}

function writeStoredState(state: StoredTourState): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage unavailable (private browsing, etc.) — the tour simply
    // won't resume across navigations; it still works within one page.
  }
}

/**
 * UX_SPEC §4: a hard reload silently exits the tour rather than resuming or
 * erroring. sessionStorage otherwise survives a reload, so this is the one
 * explicit check that distinguishes "the visitor pressed F5" from "the
 * visitor followed a Next/product link to a new route" (which does not
 * unload the tab and should resume normally).
 */
function isHardReload(): boolean {
  try {
    const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return entry?.type === "reload";
  } catch {
    return false;
  }
}

/**
 * Lightweight, dependency-free guided-tour overlay (packet L1). Mounted once
 * in `WorkspaceShell` so it persists across every `/w/[workspace]/*` route;
 * each full-page navigation between tour steps remounts this component, so
 * `sessionStorage` — not React state — is the source of truth for whether
 * the tour is active and which step it's on.
 */
export function TourOverlay({ workspace, base, packId }: { workspace: string; base: string; packId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [index, setIndex] = useState<number | null>(null);
  const [target, setTarget] = useState<DOMRect | null>(null);
  const [pending, setPending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const initializedReload = useRef(false);

  useEffect(() => {
    if (packId !== TOUR_PACK_ID) return;
    if (!initializedReload.current) {
      initializedReload.current = true;
      if (isHardReload()) window.sessionStorage.removeItem(STORAGE_KEY);
    }

    const stored = readStoredState();
    const startedNow = new URLSearchParams(window.location.search).get("tour") === "1" && stored === null;
    let active = stored?.active ?? startedNow;
    let currentIndex = stored?.index ?? 0;
    if (!active) {
      setIndex(null);
      return;
    }

    const current = TOUR_STEPS[currentIndex];
    if (current !== undefined && !current.match(pathname, base) && currentIndex !== LAST_INDEX) {
      const forward = TOUR_STEPS.findIndex((step, i) => i > currentIndex && i < LAST_INDEX && step.match(pathname, base));
      const any = forward !== -1 ? forward : TOUR_STEPS.findIndex((step, i) => i < LAST_INDEX && step.match(pathname, base));
      if (any !== -1) currentIndex = any;
    }
    active = true;
    writeStoredState({ active, index: currentIndex });
    setIndex(currentIndex);
  }, [pathname, base, packId]);

  useEffect(() => {
    if (index === null) {
      setTarget(null);
      return;
    }
    const step = TOUR_STEPS[index];
    if (step === undefined) return;

    function locate() {
      const element = document.querySelector(step!.target);
      setTarget(element === null ? null : element.getBoundingClientRect());
    }
    locate();
    window.addEventListener("resize", locate);
    window.addEventListener("scroll", locate, true);
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("resize", locate);
      window.removeEventListener("scroll", locate, true);
      observer.disconnect();
    };
  }, [index, pathname]);

  useEffect(() => {
    if (index !== null) panelRef.current?.focus();
  }, [index]);

  const exit = useCallback(() => {
    writeStoredState({ active: false, index: 0 });
    setIndex(null);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") exit();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exit]);

  if (index === null) return null;
  const step = TOUR_STEPS[index];
  if (step === undefined) return null;

  function advanceTo(nextIndex: number, path: string | null) {
    writeStoredState({ active: true, index: nextIndex });
    setIndex(nextIndex);
    if (path !== null) router.push(withLens(path, TOUR_STEPS[nextIndex]!.lens));
  }

  async function goNext() {
    if (step!.beforeNext === "process-related-fixtures") {
      setPending(true);
      await processFixtureArtifacts(workspace, RELATED_FIXTURE_IDS);
      setPending(false);
    }
    const nextIndex = Math.min(index! + 1, LAST_INDEX);
    if (step!.next.kind === "same-page") {
      advanceTo(nextIndex, null);
    } else if (step!.next.kind === "static") {
      advanceTo(nextIndex, step!.next.path(base));
    } else if (step!.next.kind === "dynamic") {
      const link = document.querySelector(step!.next.selector);
      const href = link?.getAttribute("href") ?? null;
      if (href !== null) advanceTo(nextIndex, href);
    }
  }

  function goBack() {
    const prevIndex = Math.max(index! - 1, 0);
    writeStoredState({ active: true, index: prevIndex });
    setIndex(prevIndex);
  }

  return (
    <>
      {target !== null ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-40 rounded-md ring-4 ring-[var(--color-accent)] ring-offset-2 transition-all duration-150"
          style={{ top: target.top - 4, left: target.left - 4, width: target.width + 8, height: target.height + 8 }}
        />
      ) : null}
      <div
        ref={panelRef}
        data-testid="tour-panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-panel-heading"
        tabIndex={-1}
        // `pointer-events-none` on the panel itself, restored to `auto` only
        // on the button row below: the panel floats over real screen content
        // (UX_SPEC §4 — it is an overlay on top of normal screens, not a
        // blocking modal), so its text area must never intercept clicks
        // meant for the real Accept/Approve/Process controls underneath it.
        className="pointer-events-none fixed bottom-4 right-4 z-50 w-full max-w-sm rounded-lg border border-border bg-surface p-4 text-left shadow-lg outline-none"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Guided tour · Step {index + 1} of {TOUR_STEPS.length}
        </p>
        <h2 id="tour-panel-heading" className="mt-1 text-sm font-semibold text-ink">
          {step.title}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{step.body}</p>
        {step.actionHint !== undefined ? <p className="mt-2 text-xs font-medium text-ink">{step.actionHint}</p> : null}
        <div className="pointer-events-auto mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={index === 0}
              onClick={goBack}
              className="text-sm text-ink-muted underline-offset-2 hover:underline disabled:opacity-40"
            >
              Back
            </button>
            {step.next.kind === "none" ? null : (
              <button
                type="button"
                disabled={pending}
                onClick={() => void goNext()}
                className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-accent-ink)] disabled:opacity-60"
              >
                {pending ? "Working…" : "Next"}
              </button>
            )}
          </div>
          <button type="button" onClick={exit} className="text-sm text-ink-muted underline-offset-2 hover:underline">
            Exit tour
          </button>
        </div>
      </div>
    </>
  );
}
