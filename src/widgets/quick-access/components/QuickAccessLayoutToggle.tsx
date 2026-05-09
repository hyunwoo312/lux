import { AnimatePresence, motion } from "motion/react";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";

const iconSpin = {
  initial: { opacity: 0, scale: 0.6, rotate: -90 },
  animate: { opacity: 1, scale: 1, rotate: 0 },
  exit: { opacity: 0, scale: 0.6, rotate: 90 },
  transition: { duration: 0.18, ease: "easeOut" },
} as const;

export function QuickAccessLayoutToggle() {
  const view = useQuickAccessStore((s) => s.view);
  const setView = useQuickAccessStore((s) => s.setView);
  const isGrid = view === "grid";

  return (
    <Tooltip content={isGrid ? "Grid view" : "List view"} sticky>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground/60 hover:text-foreground size-7 rounded-sm [&_svg]:size-4"
        aria-label={isGrid ? "Switch to list view" : "Switch to grid view"}
        onClick={() => setView(isGrid ? "list" : "grid")}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isGrid ? (
            <motion.span key="grid" {...iconSpin}>
              <LayoutGrid />
            </motion.span>
          ) : (
            <motion.span key="list" {...iconSpin}>
              <List />
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </Tooltip>
  );
}
