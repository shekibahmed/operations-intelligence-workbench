import type { ReactNode } from "react";

import { CountUp } from "@/components/marketing/CountUp";

const EVALUATION_DOC =
  "https://github.com/shekibahmed/operations-intelligence-workbench/blob/main/docs/EVALUATION.md";

interface StatsProps {
  packCount: number;
  lensCount: number;
  stageCount: number;
}

function Stat({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse justify-end gap-1">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-3xl font-semibold tabular-nums tracking-tight text-ink sm:text-4xl">
        {children}
      </dd>
    </div>
  );
}

/** Four truthful, countable facts about the project. Server component. */
export function Stats({ packCount, lensCount, stageCount }: StatsProps) {
  return (
    <section aria-label="At a glance" className="border-t border-border bg-surface">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
        <Stat label="scenario packs, one core">
          <CountUp value={packCount} />
        </Stat>
        <Stat label="lenses on the same evidence">
          <CountUp value={lensCount} />
        </Stat>
        <Stat label="pipeline stages, source to audit">
          <CountUp value={stageCount} />
        </Stat>
        <Stat
          label={
            <>
              evaluation score on synthetic fixtures (
              <a
                href={EVALUATION_DOC}
                className="rounded-sm font-medium text-[var(--color-accent-soft-ink)] underline underline-offset-2"
              >
                how it is measured
              </a>
              )
            </>
          }
        >
          <CountUp value={1} decimals={3} />
        </Stat>
      </dl>
    </section>
  );
}
