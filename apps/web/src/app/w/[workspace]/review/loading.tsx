import { Skeleton } from "@/components/ui/Skeleton";

export default function ReviewQueueLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[16rem_1fr_20rem]">
      <Skeleton className="h-96" label="Loading review queue" />
      <Skeleton className="h-96" label="Loading raw source" />
      <Skeleton className="h-96" label="Loading observation detail" />
    </div>
  );
}
