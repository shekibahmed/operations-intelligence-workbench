import { AdaptForm } from "@/app/adapt/AdaptForm";
import { resolveScreenState } from "@/types/screen-state";

export default async function AdaptCtaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawScenario = params.scenario;
  const scenario = Array.isArray(rawScenario) ? (rawScenario[0] ?? "") : (rawScenario ?? "");
  const state = resolveScreenState(params.state);
  const forcedState = state === "loading" ? "submitting" : state === "error" ? "error" : undefined;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-xl font-semibold text-ink">Adapt this workflow to your organisation</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Tell us about your operational workflow and we&apos;ll follow up with a scoped
          conversation about adapting the platform to it.
        </p>
      </div>
      <AdaptForm scenario={scenario} forcedState={forcedState} />
    </main>
  );
}
