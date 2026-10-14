import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { panelVariants } from "@/lib/motion";
import type { WidgetContentProps } from "@/widgets/core/types";
import { BrowserTab } from "@/widgets/quick-access/components/BrowserTab";
import { HomeTab } from "@/widgets/quick-access/components/HomeTab";
import { useQuickAccess } from "@/widgets/quick-access/useQuickAccessStore";
import type { QuickAccessTab } from "@/widgets/quick-access/types";

export function QuickAccessWidget({ editing }: WidgetContentProps) {
  const reduced = useReducedMotion();
  const activeTab = useQuickAccess((d) => d.activeTab);
  const [visited, setVisited] = useState<QuickAccessTab[]>([activeTab]);
  if (!visited.includes(activeTab)) setVisited([...visited, activeTab]);
  return (
    <div className="relative h-full">
      {visited.map((tab) => {
        const active = tab === activeTab;
        return (
          <motion.div
            key={tab}
            hidden={!active}
            variants={panelVariants(reduced)}
            initial="hidden"
            animate={active ? "show" : "hidden"}
            className="absolute inset-0"
          >
            {tab === "home" ? (
              <HomeTab editing={editing} active={active} />
            ) : (
              <BrowserTab tab={tab} editing={editing} active={active} />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
