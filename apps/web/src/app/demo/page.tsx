import Link from "next/link";

import type { ComponentType, SVGProps } from "react";

import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { IconFiles, IconTrendUp, IconZap } from "@/components/marketing/icons";
import { BUTTON_BASE_CLASSES, VARIANT_CLASSES } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { stubPacks } from "@/lib/stub/packs";
import { resolveScreenState } from "@/types/screen-state";

const PACK_ICONS: ComponentType<SVGProps<SVGSVGElement>>[] = [IconTrendUp, IconZap, IconFiles];
const LENS_ORDER = [
  ["leadership", "Leadership"],
  ["operations", "Operations"],
  ["technical", "Technical"],
] as const;

export default async function ScenarioSelectorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = resolveScreenState((await searchParams).state);

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-soft-ink)]">
            Live demonstration
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Choose a scenario
          </h1>
          <p className="mt-3 text-ink-muted">
            Pick the scenario closest to your operations and follow one piece of information from
            raw source to a governed, human-approved decision — in about five minutes.
          </p>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--color-warn-ink)]/20 bg-[var(--color-warn-surface)] p-4 text-sm text-[var(--color-warn-ink)]">
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
            This demonstration uses synthetic operational information — no real organisation or
            customer data. Each visitor gets an isolated workspace; nothing you do affects
            anyone else.
          </p>
        </div>

        {state === "loading" ? (
          <div className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-96 rounded-xl" label="Loading scenario pack" />
            ))}
          </div>
        ) : state === "empty" ? (
          <div className="mt-8">
            <EmptyState
              title="No scenario packs are currently available"
              description="This indicates a deployment error, not a normal state."
            />
          </div>
        ) : state === "error" ? (
          <div className="mt-8">
            <ErrorState message="Could not load scenario packs." onRetryHref="/demo" />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {stubPacks.map((pack, index) => {
              const PackIcon = PACK_ICONS[index % PACK_ICONS.length] ?? IconFiles;
              return (
                <article
                  key={pack.id}
                  aria-labelledby={`pack-${pack.id}`}
                  className="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-card transition-shadow hover:shadow-card-hover"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent-soft-ink)]"
                    >
                      <PackIcon />
                    </span>
                    <div className="min-h-14">
                      <h2 id={`pack-${pack.id}`} className="text-lg font-semibold leading-tight text-ink">
                        {pack.name}
                      </h2>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        Guided tour · about {pack.estimatedMinutes} minutes
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-ink-muted">{pack.problemStatement}</p>

                  <dl className="mt-5 space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint">
                        Sources
                      </dt>
                      <dd className="mt-1 text-ink">{pack.sourceTypes.join(", ")}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint">
                        You will reach
                      </dt>
                      <dd className="mt-1 text-ink">{pack.exampleOutput}</dd>
                    </div>
                  </dl>

                  <div className="mt-5 border-t border-border pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint">
                      Through three lenses
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
                      {LENS_ORDER.map(([key, label]) => (
                        <li key={key} className="flex gap-2">
                          <span className="w-20 shrink-0 font-medium text-ink">{label}</span>
                          <span>{pack.lensSummary[key]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="mt-4 text-xs text-ink-faint">
                    Synthetic data only — nothing here affects any other visitor.
                  </p>

                  <Link
                    href={`/demo/${pack.id}`}
                    className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.primary} mt-5 w-full`}
                  >
                    Start with {pack.name}
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <MarketingFooter />
    </div>
  );
}
