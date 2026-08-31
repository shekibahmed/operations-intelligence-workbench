import { Skeleton } from "@/components/ui/Skeleton";

export default function RuleTraceLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-40" label="Loading rule trace" />
      ))}
    </div>
  );
}
