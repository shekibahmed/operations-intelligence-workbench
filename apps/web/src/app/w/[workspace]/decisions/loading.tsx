import { Skeleton } from "@/components/ui/Skeleton";

export default function DecisionCentreLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-busy="true">
      <Skeleton className="h-48" label="Loading decisions" />
      <Skeleton className="h-48" label="Loading decisions" />
    </div>
  );
}
