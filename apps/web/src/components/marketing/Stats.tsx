import type { ReactNode } from "react";

import { CountUp } from "@/components/marketing/CountUp";
import { ProvenanceBadge } from "@/components/widgets/ProvenanceBadge";

const EVALUATION_DOC =
  "https://github.com/shekibahmed/operations-intelligence-workbench/blob/main/docs/EVALUATION.md";

/**
 * Aggregate score of `pnpm eval` (docs/EVALUATION.md): every dimension 1.000
 * against all three packs, run 2026-10-18 (OIW-910). The score is Calculated
 * (deterministic harness over synthetic fixtures). Update this constant, the
 * page trust chip and the social image together when the harness result
 * changes.
 */
const EVALUATION_SCORE = 1;

interface StatsProps {
  packCount: number;
  lensCount: number;
  stageCount: number;
}

function Stat({
  label,
  children,
  provenance,
}: {
  label: ReactNode;
  children: ReactNode;
  provenance?: ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse justify-end gap-1">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-3xl font-semibold tabular-nums tracking-tight text-ink sm:text-4xl">
        <span>{children}</span>
        {provenance ? <span className="text-sm font-normal">{provenance}</span> : null}
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
          provenance={<ProvenanceBadge classification="calculated" />}
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
          <CountUp value={EVALUATION_SCORE} decimals={3} />
        </Stat>
      </dl>
    </section>
  );
}
