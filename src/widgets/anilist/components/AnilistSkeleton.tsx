import { Skeleton } from "@/components/ui/skeleton";
import { COVER_GRID } from "@/widgets/anilist/components/coverGrid";
import type { ViewMode } from "@/widgets/anilist/types";

type AnilistSkeletonProps = {
  variant: ViewMode;
  label: string;
};

export function AnilistSkeleton({ variant, label }: AnilistSkeletonProps) {
  const length = variant === "grid" ? 12 : 6;

  return (
    <div
      data-slot="anilist-skeleton"
      data-variant={variant}
      className="h-full min-h-0 flex-1 overflow-hidden px-1.5 py-1"
    >
      <span role="status" className="sr-only">
        {label}
      </span>
      {variant === "grid" ? (
        <div className={COVER_GRID} aria-hidden>
          {Array.from({ length }, (_, index) => (
            <div key={index} className="flex flex-col gap-1">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <Skeleton className="h-2.5 w-full rounded-xs" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1" aria-hidden>
          {Array.from({ length }, (_, index) => (
            <div key={index} className="flex items-center gap-2 px-1.5 py-1">
              <Skeleton className="h-12 w-9 shrink-0 rounded-md" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
