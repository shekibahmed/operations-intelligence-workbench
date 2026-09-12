import type { ComponentType, SVGProps } from "react";
import Image from "next/image";
import Link from "next/link";

import { AnalyticsPageEvents } from "@/components/analytics/AnalyticsPageEvents";
import { LogoMark } from "@/components/brand/Logo";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import {
  IconBranch,
  IconChart,
  IconChecklist,
  IconClock,
  IconDownload,
  IconEye,
  IconFiles,
  IconLock,
  IconScan,
  IconShieldCheck,
  IconTarget,
  IconTrendUp,
  IconZap,
} from "@/components/marketing/icons";
import { BUTTON_BASE_CLASSES, VARIANT_CLASSES } from "@/components/ui/Button";
import { FIRM } from "@/lib/firm";
import { stubPacks } from "@/lib/stub/packs";

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

const PIPELINE_STEPS = [
  {
    icon: IconFiles,
    title: "Capture",
    description:
      "Messages, exports, records and documents land as immutable artifacts — every one carrying exact evidence segments.",
  },
  {
    icon: IconScan,
    title: "Extract",
    description:
      "A schema-validated provider proposes structured fields with confidence. The public demo's provider is fully deterministic.",
  },
  {
    icon: IconEye,
    title: "Review",
    description:
      "Ambiguous or low-confidence fields wait for a person — accept, correct or reject with the exact source span cited.",
  },
  {
    icon: IconZap,
    title: "Assemble",
    description:
      "Accepted observations resolve to entities and assemble into operational events against a pack-defined catalogue.",
  },
  {
    icon: IconBranch,
    title: "Decide",
    description:
      "Deterministic rules propose signals, cases and decisions — with the full fact-evaluation trace attached.",
  },
  {
    icon: IconShieldCheck,
    title: "Approve & audit",
    description:
      "High-risk outcomes stay proposals until a human approval is recorded — and every step lands in an append-only audit trail.",
  },
];

const CAPABILITIES = [
  {
    icon: IconFiles,
    title: "Multi-format ingestion",
    description: "Text messages, CSV exports, JSON records and PDFs become immutable artifacts with cited evidence segments.",
  },
  {
    icon: IconScan,
    title: "Structured extraction",
    description: "Every machine-derived field carries extractor identity, version and confidence — or an explicit insufficient-evidence state.",
  },
  {
    icon: IconEye,
    title: "Human review queue",
    description: "Ambiguous extractions never silently become fact. A reviewer sees the raw source, the candidate values and the exact span.",
  },
  {
    icon: IconZap,
    title: "Events & entity resolution",
    description: "Observations assemble into operational events; entities resolve exactly or by pack-supplied aliases, with ambiguity routed to review.",
  },
  {
    icon: IconBranch,
    title: "Deterministic rules",
    description: "A closed fact catalogue — no arbitrary expressions. Every fired rule shows the evaluated facts and the condition tree that matched.",
  },
  {
    icon: IconChecklist,
    title: "Cases & action items",
    description: "Pack-defined workflow states, owners, due dates and closure requirements keep the operational response accountable.",
  },
  {
    icon: IconShieldCheck,
    title: "Governed decisions",
    description: "Providers and rules can only propose. High-risk decisions cannot reach approved without a recorded human approval — adversarially tested.",
  },
  {
    icon: IconChart,
    title: "Dashboards with provenance",
    description: "Eight widget kinds, every metric labelled observed, calculated, estimated or hypothetical — evidence never conflated with projection.",
  },
  {
    icon: IconClock,
    title: "Append-only audit trail",
    description: "Actor, subject, timestamp and causal links for every material transition. Corrections append and re-evaluate — never rewrite history.",
  },
  {
    icon: IconDownload,
    title: "Exports",
    description: "Workspace datasets export in standard formats for offline analysis — scoped to the visitor's own session.",
  },
  {
    icon: IconLock,
    title: "Adversarial security testing",
    description: "Injection matrices, workspace-scoped queries, signed sessions and rate limits — enforced in the CI gate, not just the threat model.",
  },
  {
    icon: IconTarget,
    title: "Evaluation harness",
    description: "Precision, recall, abstention and governance correctness measured across every pack — one command, reproducible numbers.",
  },
];

const TRUST_CHIPS = [
  "Demo journey enforced in CI",
  "Evaluation suite scores 1.000",
  "axe-audited accessibility",
  "Apache-2.0 open source",
];

const PACK_ICONS: ComponentType<SVGProps<SVGSVGElement>>[] = [IconTrendUp, IconZap, IconFiles];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <AnalyticsPageEvents events={[{ name: "landing-page-view" }]} />
      <MarketingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60rem 30rem at 15% -10%, var(--color-accent-soft) 0%, transparent 60%), radial-gradient(50rem 28rem at 90% 0%, #fdf3e2 0%, transparent 55%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(70rem 36rem at 50% 0%, black 30%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(70rem 36rem at 50% 0%, black 30%, transparent 75%)",
            }}
          />
          <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-ink-muted shadow-card">
              <LogoMark size={14} />
              Open-source operations intelligence
            </p>
            <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Turn scattered operational information into governed, explainable action.
            </h1>
            <p className="mt-5 max-w-2xl text-balance text-lg text-ink-muted">
              The Operations Intelligence Workbench ingests messy field reports, records and
              documents; extracts structured, evidenced observations; and routes what matters
              into cases and decisions a human approves — never the other way around.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/demo"
                className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.primary} px-5 py-2.5 text-base`}
              >
                See it work
              </Link>
              <Link
                href="/adapt"
                className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.secondary} px-5 py-2.5 text-base`}
              >
                Adapt this workflow
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-ink-muted">
              {TRUST_CHIPS.map((chip) => (
                <li key={chip} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" width={15} height={15} aria-hidden="true" className="text-[var(--color-ok-ink)]">
                    <path
                      d="M10 1.8a8.2 8.2 0 1 0 0 16.4A8.2 8.2 0 0 0 10 1.8zm3.6 6-4.3 5a.9.9 0 0 1-1.34.05L6 10.9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {chip}
                </li>
              ))}
            </ul>

            {/* Product visual */}
            <div className="relative mt-14 w-full max-w-5xl">
              <div
                aria-hidden="true"
                className="absolute -inset-x-8 -top-6 bottom-10 rounded-3xl opacity-70"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-accent-soft) 0%, transparent 45%), radial-gradient(40rem 20rem at 70% 20%, #fdf3e2 0%, transparent 60%)",
                }}
              />
              <figure className="relative overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-pop">
                <div aria-hidden="true" className="flex items-center gap-1.5 border-b border-border bg-surface-muted px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f0b429]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#43a25a]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#d9534f]" />
                  <span className="ml-3 hidden rounded-md border border-border bg-surface px-2 py-0.5 text-[0.7rem] text-ink-faint sm:block">
                    localhost:3000/demo — guided tour, step 8 of 10
                  </span>
                </div>
                <Image
                  src="/screenshots/leadership-dashboard.png"
                  alt="The Leadership dashboard after an approval: critical signals, open cases, pending decisions, a repeat-fault trend and an explicitly labelled hypothetical downtime estimate."
                  width={1440}
                  height={900}
                  priority
                  className="h-auto w-full"
                />
              </figure>
            </div>
          </div>
        </section>

        {/* Pipeline */}
        <section id="how-it-works" aria-labelledby="how-it-works-heading" className="border-t border-border bg-surface-muted/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-soft-ink)]">
                How it works
              </p>
              <h2 id="how-it-works-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                From raw source to approved action — one pipeline
              </h2>
              <p className="mt-3 text-ink-muted">
                Every conclusion is cited to its evidence, every high-risk action waits for a
                person, and every step is inspectable afterwards. The guided demo walks this
                exact path in about five minutes.
              </p>
            </div>
            <ol className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PIPELINE_STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="relative rounded-xl border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-card-hover"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent-soft-ink)]"
                    >
                      <step.icon />
                    </span>
                    <h3 className="text-base font-semibold text-ink">
                      <span className="mr-1.5 text-ink-faint">{index + 1}.</span>
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Lenses */}
        <section aria-labelledby="lenses-heading" className="border-t border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-soft-ink)]">
                One system, three views
              </p>
              <h2 id="lenses-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                The same operational state, told three ways
              </h2>
              <p className="mt-3 text-ink-muted">
                Executives, operators and engineers read the same underlying evidence through
                different lenses — no parallel spreadsheets, no translation loss.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
              {LENS_SUMMARIES.map((lens) => (
                <article
                  key={lens.title}
                  className="rounded-xl border border-border bg-surface p-6 shadow-card transition-shadow hover:shadow-card-hover"
                >
                  <h3 className="text-base font-semibold text-ink">{lens.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{lens.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section id="capabilities" aria-labelledby="capabilities-heading" className="border-t border-border bg-surface-muted/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-soft-ink)]">
                Capabilities
              </p>
              <h2 id="capabilities-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Everything the demonstration covers
              </h2>
              <p className="mt-3 text-ink-muted">
                The demo is not a slide deck — it is the running system on synthetic data, and
                every capability below is exercised by the guided tour and enforced by CI.
              </p>
            </div>
            <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((capability) => (
                <li
                  key={capability.title}
                  className="flex gap-4 rounded-xl border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-card-hover"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent-soft-ink)]"
                  >
                    <capability.icon />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{capability.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                      {capability.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Scenarios */}
        <section id="scenarios" aria-labelledby="scenarios-heading" className="border-t border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-soft-ink)]">
                  Scenario packs
                </p>
                <h2 id="scenarios-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                  Three industries. Zero code forks.
                </h2>
                <p className="mt-3 text-ink-muted">
                  Every domain concept — entities, rules, workflows, dashboards, fixtures — is
                  supplied by a validated Scenario Pack, not hardcoded. The same core runs all
                  three, plus an authoring template for your own.
                </p>
              </div>
              <Link
                href="/demo"
                className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.secondary}`}
              >
                Choose a scenario
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {stubPacks.map((pack, index) => {
                const PackIcon = PACK_ICONS[index % PACK_ICONS.length] ?? IconFiles;
                return (
                  <article
                    key={pack.id}
                    aria-labelledby={`landing-pack-${pack.id}`}
                    className="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-card transition-shadow hover:shadow-card-hover"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent-soft-ink)]"
                    >
                      <PackIcon width={22} height={22} />
                    </span>
                    <h3 id={`landing-pack-${pack.id}`} className="mt-4 text-base font-semibold text-ink">
                      {pack.name}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                      {pack.problemStatement}
                    </p>
                    <p className="mt-4 text-xs text-ink-faint">
                      {pack.sourceTypes.join(" · ")}
                    </p>
                    <Link
                      href={`/demo/${pack.id}`}
                      className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.secondary} mt-5 justify-center`}
                    >
                      Start with {pack.name}
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Run it locally */}
        <section aria-labelledby="run-locally-heading" className="border-t border-border bg-surface-muted/60">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-soft-ink)]">
                Run it yourself
              </p>
              <h2 id="run-locally-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                No sign-up, no API key, no network calls
              </h2>
              <p className="mt-3 text-ink-muted">
                The demo runs entirely on your machine against a local Postgres, on a fully
                deterministic fixture provider. Clone it, run four commands, and you are walking
                the same journey CI enforces on every commit.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl bg-[#12151c] shadow-pop">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                <span className="text-xs font-medium text-white/60">quick start</span>
                <span className="text-xs text-white/70">Node ≥ 22 · pnpm 11</span>
              </div>
              <pre
                tabIndex={0}
                aria-label="Quick start commands"
                className="overflow-x-auto bg-[#12151c] p-5 text-[0.8rem] leading-relaxed text-[#e6e9f0]"
              >
                <code>
                  {`git clone https://github.com/shekibahmed/operations-intelligence-workbench
cd operations-intelligence-workbench
pnpm install
docker compose up -d      # local Postgres 17
pnpm db:migrate           # apply schema migrations
pnpm dev                  # → http://localhost:3000/demo`}
                </code>
              </pre>
            </div>
          </div>
        </section>

        {/* Firm CTA */}
        <section aria-labelledby="firm-heading" className="border-t border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-[var(--color-accent-soft)] px-6 py-12 text-center sm:px-12">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(40rem 18rem at 20% 0%, rgba(255,255,255,0.55) 0%, transparent 60%)",
                }}
              />
              <div className="relative">
                <h2 id="firm-heading" className="text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                  Watched the demo and thought &ldquo;our operations live in exactly this mess&rdquo;?
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-ink-muted">
                  {FIRM.name} — <em>let AI do the grunt work, so you can run the business</em> —
                  builds exactly the pattern this workbench demonstrates: evidence-backed
                  extraction, deterministic rules, human approval, and a full audit trail,
                  adapted to your workflows.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/adapt"
                    className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.primary} px-5 py-2.5 text-base`}
                  >
                    Describe your workflow
                  </Link>
                  <a
                    href={FIRM.site}
                    className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.secondary} px-5 py-2.5 text-base`}
                  >
                    Visit {FIRM.name}
                  </a>
                </div>
                <p className="mt-6 text-sm text-ink-muted">
                  Or write directly to{" "}
                  <a href={`mailto:${FIRM.email}`} className="font-medium text-[var(--color-accent-soft-ink)] underline underline-offset-2">
                    {FIRM.email}
                  </a>{" "}
                  — a good first message names one workflow where information gets lost between
                  source systems.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
