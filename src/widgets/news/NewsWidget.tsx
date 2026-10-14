import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { panelVariants } from "@/lib/motion";
import { NewsHeadlines } from "@/widgets/news/NewsHeadlines";
import { TrendingContent } from "@/widgets/news/components/TrendingContent";
import { TrendingRegion } from "@/widgets/news/components/TrendingRegion";
import { useNews } from "@/widgets/news/useNewsStore";
import { cn } from "@/lib/utils";

export function NewsWidget() {
  const reduced = useReducedMotion() ?? false;
  const view = useNews((d) => d.view);
  const layout = useNews((d) => d.layout);
  return (
    <div className="relative h-full min-h-0">
      <div className={cn("h-full", view !== "news" && "hidden")}>
        <NewsHeadlines active={view === "news"} />
      </div>
      <AnimatePresence initial={false}>
        {view === "trending" && (
          <motion.div
            variants={panelVariants(reduced)}
            initial="hidden"
            animate="show"
            exit="exit"
            className="absolute inset-0 flex min-h-0 flex-col gap-2 pt-1"
          >
            <div className="shrink-0">
              <TrendingRegion />
            </div>
            <div className="min-h-0 flex-1">
              <TrendingContent layout={layout} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
