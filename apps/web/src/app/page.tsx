import Link from "next/link";

import { AnalyticsPageEvents } from "@/components/analytics/AnalyticsPageEvents";
import { BUTTON_BASE_CLASSES, VARIANT_CLASSES } from "@/components/ui/Button";
import { FIRM } from "@/lib/firm";

const LENS_SUMMARIES = [
  {
    title: "Leadership",
    description: "Business impact, risk summary, decisions and trends — a buyer conversation.",
  },
  {
    title: "Operations",
    description: "How work is executed — queues, assignments, workflow state, accountability.",
  },
  {
    title: "Technical",
    description: "Proof the system is explainable, controlled and implementable.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-16">
      <AnalyticsPageEvents events={[{ name: "landing-page-view" }]} />
      <section>
        <h1 className="text-3xl font-semibold text-ink">
          Turn scattered operational information into governed, explainable action.
        </h1>
        <p className="mt-4 max-w-2xl text-ink-muted">
          The Operations Intelligence Workbench ingests messy field reports, records and
          documents; extracts structured, evidenced observations; and routes what matters into
          cases and decisions a human approves — never the other way around.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/demo" className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.primary}`}>
            See it work
          </Link>
          <Link href="/adapt" className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.secondary}`}>
            Adapt this workflow
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">One system, three views</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {LENS_SUMMARIES.map((lens) => (
            <article key={lens.title} className="rounded-lg border border-border bg-surface p-4">
              <h3 className="text-sm font-semibold text-ink">{lens.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{lens.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="flex flex-wrap items-center gap-4 border-t border-border pt-6 text-sm text-ink-muted">
        <Link href="/demo" className="hover:underline">
          Try the demonstration
        </Link>
        <Link href="/adapt" className="hover:underline">
          Adapt this workflow
        </Link>
        <a
          href="https://github.com/shekibahmed/operations-intelligence-workbench"
          className="hover:underline"
        >
          Public repository
        </a>
        <span className="ml-auto">
          Built by{" "}
          <a href={FIRM.site} className="font-medium text-ink hover:underline">
            {FIRM.name}
          </a>{" "}
          —{" "}
          <a href={`mailto:${FIRM.email}`} className="hover:underline">
            {FIRM.email}
          </a>
        </span>
      </footer>
    </main>
  );
}
