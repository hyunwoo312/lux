import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ErrorState } from "@/components/StateMessage";
import { Skeleton } from "@/components/ui/skeleton";
import { DURATION, EASE_OUT, listVariants, rowVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { movementFor } from "@/widgets/news/lib/trend-movement";
import { regionLabel } from "@/widgets/news/lib/trend-regions";
import { TrendingRow } from "@/widgets/news/components/TrendingRow";
import { TrendingTile } from "@/widgets/news/components/TrendingTile";
import { TILE_GRID_CLASS } from "@/widgets/news/components/tileStyles";
import { TrendsAttribution } from "@/widgets/news/components/TrendsAttribution";
import { useTrendingResource } from "@/widgets/news/hooks/useTrendingResource";
import { useNews } from "@/widgets/news/useNewsStore";
import type { NewsLayout } from "@/widgets/news/types";

export function TrendingContent({ layout }: { layout: NewsLayout }) {
  const reduced = useReducedMotion() ?? false;
  const openBehavior = useNews((d) => d.openBehavior);
  const loadImages = useNews((d) => d.loadImages);
  const { state, feed, previousRanks, refresh, isRefreshing, region } = useTrendingResource();

  const isTiles = layout === "tiles" && loadImages;
  const items = feed?.items ?? [];

  if (state.status === "error" && !feed) {
    return (
      <ErrorState
        error={state.error}
        service="Google Trends"
        subject={`what’s trending in ${regionLabel(region)}`}
        onRetry={refresh}
        retrying={isRefreshing}
      />
    );
  }

  if (!feed) {
    return (
      <div className={cn("h-full", isTiles ? TILE_GRID_CLASS : "flex flex-col gap-1.5")}>
        {Array.from({ length: isTiles ? 6 : 7 }, (_, index) => (
          <Skeleton
            key={index}
            className={cn("w-full shrink-0", isTiles ? "aspect-[16/9]" : "h-12 rounded-lg")}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="scroll-fade min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <motion.ul
          key={`${layout}:${region}`}
          initial="hidden"
          animate="show"
          variants={listVariants(reduced)}
          className={cn(isTiles ? TILE_GRID_CLASS : "flex flex-col gap-0.5")}
        >
          <AnimatePresence initial={false}>
            {items.map((item, index) => {
              const movement = movementFor(item.term, index + 1, previousRanks);
              return (
                <motion.li
                  key={item.term}
                  layout={reduced ? false : "position"}
                  variants={rowVariants(reduced)}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                  transition={{ duration: reduced ? 0 : DURATION.base, ease: EASE_OUT }}
                  className="min-w-0"
                >
                  {isTiles ? (
                    <TrendingTile
                      item={item}
                      rank={index + 1}
                      movement={movement}
                      openBehavior={openBehavior}
                    />
                  ) : (
                    <TrendingRow
                      item={item}
                      rank={index + 1}
                      movement={movement}
                      openBehavior={openBehavior}
                      withThumbnail={loadImages}
                    />
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      </div>
      <TrendsAttribution />
    </div>
  );
}
