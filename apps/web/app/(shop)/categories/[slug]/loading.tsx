import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/modules/catalog/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy>
      <div className="space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-7 w-48" />
      </div>
      <Skeleton className="h-14 w-full" />
      <ProductGridSkeleton />
    </div>
  );
}
