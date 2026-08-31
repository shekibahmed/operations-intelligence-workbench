import { notFound } from "next/navigation";

import { GuidedStartActions } from "@/app/demo/[pack]/GuidedStartActions";
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
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-xl font-semibold text-ink">{pack.name}</h1>
        <p className="mt-2 text-sm text-ink-muted">{pack.problemStatement}</p>
      </div>

      <p className="rounded-md border border-border bg-surface p-3 text-sm text-ink-muted">
        Selecting an entry point below creates an isolated synthetic workspace — nothing here
        affects any other visitor.
      </p>

      <section aria-labelledby="data-manifest-heading" className="rounded-lg border border-border bg-surface p-4">
        <h2 id="data-manifest-heading" className="text-sm font-semibold text-ink">
          What will be created
        </h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-ink-muted">
          {DATA_MANIFEST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <GuidedStartActions packId={pack.id} forcedState={forcedState} />
    </main>
  );
}
