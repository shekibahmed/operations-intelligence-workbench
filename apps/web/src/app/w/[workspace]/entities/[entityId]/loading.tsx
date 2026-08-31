import { Skeleton } from "@/components/ui/Skeleton";

export default function EntityDetailLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {Array.from({ length: 9 }, (_, index) => (
        <Skeleton key={index} className="h-32" label="Loading entity section" />
      ))}
    </div>
  );
}
