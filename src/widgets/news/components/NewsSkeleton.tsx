import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TILE_GRID_CLASS } from "@/widgets/news/components/tileStyles";
import type { NewsLayout } from "@/widgets/news/types";

type NewsSkeletonProps = {
  layout: NewsLayout;
  withThumbnail: boolean;
};

export function NewsSkeleton({ layout, withThumbnail }: NewsSkeletonProps) {
  if (layout === "tiles") {
    return (
      <div className={cn(TILE_GRID_CLASS, "p-0.5")}>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="aspect-[16/9] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-start gap-2.5">
          {withThumbnail && <Skeleton className="size-11 shrink-0 rounded-md" />}
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
