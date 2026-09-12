import { AdaptForm } from "@/app/adapt/AdaptForm";
import { AnalyticsPageEvents } from "@/components/analytics/AnalyticsPageEvents";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { IconMessage, IconShieldCheck, IconZap } from "@/components/marketing/icons";
import { FIRM } from "@/lib/firm";
import { findPackById, stubPacks } from "@/lib/stub/packs";
import { resolveScreenState } from "@/types/screen-state";

const WHAT_HAPPENS_NEXT = [
  {
    icon: IconMessage,
    title: "A scoped conversation",
    description:
      "We read your workflow description and reply with the shortest path to a pilot — usually a scenario pack modelled on your operation.",
  },
  {
    icon: IconZap,
    title: "A pack-shaped pilot",
    description:
      "Your sources, entities, rules and dashboards become a validated Scenario Pack on the same core you just watched run.",
  },
  {
    icon: IconShieldCheck,
    title: "Governance from day one",
    description:
      "Approval policies, evidence citation and the audit trail are part of the adaptation — not an afterthought.",
  },
];

export default async function AdaptCtaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawScenario = params.scenario;
  const requestedScenario = Array.isArray(rawScenario) ? (rawScenario[0] ?? "") : (rawScenario ?? "");
  const scenario = findPackById(requestedScenario)?.id ?? "";
  const state = resolveScreenState(params.state);
  const forcedState = state === "loading" ? "submitting" : state === "error" ? "error" : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <AnalyticsPageEvents
        events={[{
          name: "cta-opened",
          context: scenario === "" ? undefined : { scenarioId: scenario },
        }]}
      />
      <MarketingHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-soft-ink)]">
            Adapt this workflow
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Adapt this workflow to your organisation
          </h1>
          <p className="mt-3 text-ink-muted">
            Tell us about your operational workflow and we&apos;ll follow up with a scoped
            conversation about adapting the platform to it.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_28rem]">
          <div className="flex flex-col gap-6">
            <section aria-labelledby="what-next-heading" className="rounded-xl border border-border bg-surface p-6 shadow-card">
              <h2 id="what-next-heading" className="text-base font-semibold text-ink">
                What happens after you submit
              </h2>
              <ul className="mt-4 flex flex-col gap-5">
                {WHAT_HAPPENS_NEXT.map((step) => (
                  <li key={step.title} className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent-soft-ink)]"
                    >
                      <step.icon />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="direct-contact-heading" className="rounded-xl border border-border bg-surface p-6 shadow-card">
              <h2 id="direct-contact-heading" className="text-base font-semibold text-ink">
                Prefer to reach us directly?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                This platform is built and maintained by{" "}
                <a href={FIRM.site} className="font-medium text-ink underline underline-offset-2" rel="noopener noreferrer">
                  {FIRM.name}
                </a>{" "}
                — an AI consultancy whose pitch is <em>let AI do the grunt work, so you can run
                the business</em>.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <a href={`mailto:${FIRM.email}`} className="font-medium text-[var(--color-accent-soft-ink)] underline underline-offset-2">
                  {FIRM.email}
                </a>
                <a href={FIRM.whatsapp} className="font-medium text-[var(--color-accent-soft-ink)] underline underline-offset-2" rel="noopener noreferrer">
                  WhatsApp {FIRM.whatsappDisplay}
                </a>
                <a href={FIRM.linkedin} className="font-medium text-[var(--color-accent-soft-ink)] underline underline-offset-2" rel="noopener noreferrer">
                  LinkedIn
                </a>
              </div>
            </section>

            <p className="rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed text-ink-muted">
              <span className="font-medium text-ink">Privacy:</span> the demonstration uses
              synthetic data. This assessment stores only the organisation, workflow and contact
              details you choose to provide so we can respond to your enquiry. Do not submit
              confidential operational records.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 shadow-card sm:p-8">
            <AdaptForm
              scenario={scenario}
              scenarioOptions={stubPacks.map((pack) => ({ id: pack.id, name: pack.name }))}
              forcedState={forcedState}
            />
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
