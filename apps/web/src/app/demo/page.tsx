import Link from "next/link";

import { BUTTON_BASE_CLASSES, VARIANT_CLASSES } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { stubPacks } from "@/lib/stub/packs";
import { resolveScreenState } from "@/types/screen-state";

export default async function ScenarioSelectorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = resolveScreenState((await searchParams).state);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <h1 className="text-xl font-semibold text-ink">Choose a scenario</h1>
      <p className="rounded-md border border-border bg-surface p-3 text-sm text-ink-muted">
        This demonstration uses synthetic operational information. Select a scenario and follow
        the information from source to action.
      </p>

      {state === "loading" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-64" label="Loading scenario pack" />
          ))}
        </div>
      ) : state === "empty" ? (
        <EmptyState title="No scenario packs are currently available" description="This indicates a deployment error, not a normal state." />
      ) : state === "error" ? (
        <ErrorState message="Could not load scenario packs." onRetryHref="/demo" />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {stubPacks.map((pack) => (
            <article key={pack.id} aria-labelledby={`pack-${pack.id}`} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
              <h2 id={`pack-${pack.id}`} className="text-base font-semibold text-ink">
                {pack.name}
              </h2>
              <p className="text-sm text-ink-muted">{pack.problemStatement}</p>
              <dl className="text-xs text-ink-muted">
                <dt className="font-medium text-ink">Sources</dt>
                <dd>{pack.sourceTypes.join(", ")}</dd>
                <dt className="mt-2 font-medium text-ink">Example output</dt>
                <dd>{pack.exampleOutput}</dd>
                <dt className="mt-2 font-medium text-ink">Estimated length</dt>
                <dd>{pack.estimatedMinutes} minutes</dd>
              </dl>
              <p className="text-xs text-ink-muted">Synthetic data only — nothing here affects any other visitor.</p>
              <Link href={`/demo/${pack.id}`} className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.primary} mt-auto`}>
                Start with {pack.name}
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
