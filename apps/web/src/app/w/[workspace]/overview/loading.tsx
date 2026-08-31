import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Next.js wraps `page.tsx` in a `<Suspense>` boundary using this file
 * automatically (App Router `loading.tsx` convention), so this is real
 * streaming loading state driven by the actual data fetch below, not a
 * `?state=loading` simulation.
 */
export default function OverviewLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-32" label="Loading widget" />
      ))}
    </div>
  );
}
