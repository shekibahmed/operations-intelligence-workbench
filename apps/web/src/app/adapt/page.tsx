import { AdaptForm } from "@/app/adapt/AdaptForm";
import { AnalyticsPageEvents } from "@/components/analytics/AnalyticsPageEvents";
import { findPackById, stubPacks } from "@/lib/stub/packs";
import { resolveScreenState } from "@/types/screen-state";

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
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <AnalyticsPageEvents
        events={[{
          name: "cta-opened",
          context: scenario === "" ? undefined : { scenarioId: scenario },
        }]}
      />
      <div>
        <h1 className="text-xl font-semibold text-ink">Adapt this workflow to your organisation</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Tell us about your operational workflow and we&apos;ll follow up with a scoped
          conversation about adapting the platform to it.
        </p>
      </div>
      <p className="rounded-md border border-border bg-surface p-3 text-sm text-ink-muted">
        The demonstration uses synthetic data. This assessment stores only the organisation,
        workflow and contact details you choose to provide so we can respond to your enquiry.
        Do not submit confidential operational records.
      </p>
      <AdaptForm
        scenario={scenario}
        scenarioOptions={stubPacks.map((pack) => ({ id: pack.id, name: pack.name }))}
        forcedState={forcedState}
      />
    </main>
  );
}
