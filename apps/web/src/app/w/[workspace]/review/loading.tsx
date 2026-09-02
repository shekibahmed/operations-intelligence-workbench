import { Skeleton } from "@/components/ui/Skeleton";

export default function ReviewQueueLoading() {
  return (
    <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[16rem_1fr_20rem]">
      <Skeleton className="h-10 xl:h-96" label="Loading review queue" />
      <Skeleton className="h-96" label="Loading raw source" />
      <Skeleton className="h-96" label="Loading observation detail" />
    </div>
  );
}
