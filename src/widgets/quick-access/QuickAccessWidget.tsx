import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { panelVariants } from "@/lib/motion";
import type { WidgetContentProps } from "@/widgets/core/types";
import { BrowserTab } from "@/widgets/quick-access/components/BrowserTab";
import { HomeTab } from "@/widgets/quick-access/components/HomeTab";
import { useQuickAccess } from "@/widgets/quick-access/useQuickAccessStore";

export function QuickAccessWidget({ editing }: WidgetContentProps) {
  const reduced = useReducedMotion();
  const activeTab = useQuickAccess((d) => d.activeTab);

  return (
    <div className="relative h-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          variants={panelVariants(reduced)}
          initial="hidden"
          animate="show"
          exit="exit"
          className="h-full"
        >
          {activeTab === "home" ? (
            <HomeTab editing={editing} />
          ) : (
            <BrowserTab tab={activeTab} editing={editing} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
