import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/modules/catalog/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy>
      <Skeleton className="h-8 w-56" />
      <ProductGridSkeleton />
    </div>
  );
}
