import { Skeleton } from "@/components/ui/Skeleton";

export default function CaseDetailLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-40" label="Loading case section" />
      ))}
    </div>
  );
}
