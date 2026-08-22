import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Variants } from "motion/react";
import { RetryButton, StateMessage } from "@/components/StateMessage";
import { Skeleton } from "@/components/ui/skeleton";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { movementFor } from "@/widgets/news/lib/trend-movement";
import { regionLabel } from "@/widgets/news/lib/trend-regions";
import { TrendingRow } from "@/widgets/news/components/TrendingRow";
import { TrendingTile } from "@/widgets/news/components/TrendingTile";
import { TrendsAttribution } from "@/widgets/news/components/TrendsAttribution";
import { useTrendingResource } from "@/widgets/news/hooks/useTrendingResource";
import { useNews } from "@/widgets/news/useNewsStore";
import type { NewsLayout } from "@/widgets/news/types";

const TILE_GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-1.5";
const STAGGER = 0.035;

export function TrendingContent({ layout }: { layout: NewsLayout }) {
  const reduced = useReducedMotion() ?? false;
  const openBehavior = useNews((d) => d.openBehavior);
  const loadImages = useNews((d) => d.loadImages);
  const { state, feed, previousRanks, refresh, isRefreshing, region } = useTrendingResource();

  const isTiles = layout === "tiles" && loadImages;
  const items = feed?.items ?? [];

  const listVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : STAGGER } },
  };
  const itemVariants: Variants = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : DURATION.base, ease: EASE_OUT },
    },
  };

  if (state.status === "error" && !feed) {
    return (
      <StateMessage
        message={`Couldn’t load what's trending in ${regionLabel(region)}.`}
        action={<RetryButton onRetry={refresh} retrying={isRefreshing} />}
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
          variants={listVariants}
          className={cn(isTiles ? TILE_GRID_CLASS : "flex flex-col gap-0.5")}
        >
          <AnimatePresence initial={false}>
            {items.map((item, index) => {
              const movement = movementFor(item.term, index + 1, previousRanks);
              return (
                <motion.li
                  key={item.term}
                  layout={reduced ? false : "position"}
                  variants={itemVariants}
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
