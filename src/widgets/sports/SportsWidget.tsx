import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { panelVariants } from "@/lib/motion";
import { DiscoverTab } from "@/widgets/sports/components/DiscoverTab";
import { FavoritesTab } from "@/widgets/sports/components/FavoritesTab";
import { useSports } from "@/widgets/sports/useSportsStore";

export function SportsWidget() {
  const tab = useSports((d) => d.tab);
  const reduced = useReducedMotion() ?? false;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tab}
        variants={panelVariants(reduced)}
        initial="hidden"
        animate="show"
        exit="exit"
        className="h-full"
      >
        {tab === "favorites" ? <FavoritesTab /> : <DiscoverTab />}
      </motion.div>
    </AnimatePresence>
  );
}
