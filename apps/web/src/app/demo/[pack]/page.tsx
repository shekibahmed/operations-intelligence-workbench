import { notFound } from "next/navigation";

import { GuidedStartActions } from "@/app/demo/[pack]/GuidedStartActions";
import { AnalyticsPageEvents } from "@/components/analytics/AnalyticsPageEvents";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { IconChecklist } from "@/components/marketing/icons";
import { findPackById } from "@/lib/stub/packs";
import { resolveScreenState } from "@/types/screen-state";

const DATA_MANIFEST = [
  "Assets and locations",
  "Historical events",
  "Open cases",
  "Source artifacts",
  "Rules",
  "Metrics",
];

export default async function GuidedScenarioStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ pack: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { pack: packId } = await params;
  const pack = findPackById(packId);
  if (!pack) notFound();

  const state = resolveScreenState((await searchParams).state);
  const forcedState = state === "loading" || state === "error" ? state : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <AnalyticsPageEvents
        events={[{ name: "scenario-selected", context: { scenarioId: pack.id } }]}
      />
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-soft-ink)]">
            Scenario
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {pack.name}
          </h1>
          <p className="mt-3 leading-relaxed text-ink-muted">{pack.problemStatement}</p>

          <div className="mt-5 flex items-start gap-3 rounded-lg border border-[var(--color-warn-ink)]/20 bg-[var(--color-warn-surface)] p-3.5 text-sm text-[var(--color-warn-ink)]">
            <svg viewBox="0 0 20 20" width={18} height={18} aria-hidden="true" className="mt-0.5 shrink-0">
              <path
                d="M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zm0 4v4m0 2.8v.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            <p>
              Selecting an entry point below creates an isolated synthetic workspace — nothing
              here affects any other visitor.
            </p>
          </div>

          <section aria-labelledby="data-manifest-heading" className="mt-6">
            <h2 id="data-manifest-heading" className="text-sm font-semibold text-ink">
              What will be created in your workspace
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DATA_MANIFEST.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-ink-muted">
                  <span aria-hidden="true" className="text-[var(--color-ok-ink)]">
                    <IconChecklist width={16} height={16} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-8 border-t border-border pt-6">
            <GuidedStartActions packId={pack.id} forcedState={forcedState} />
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
