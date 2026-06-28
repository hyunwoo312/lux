import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/BaseWidget";
import type { WidgetIcon } from "@/widgets/core/types";

type ViewToggleButtonProps = {
  targetKey: string;
  targetLabel: string;
  icon: WidgetIcon;
  onToggle: () => void;
};

export function ViewToggleButton({
  targetKey,
  targetLabel,
  icon: Icon,
  onToggle,
}: ViewToggleButtonProps) {
  const reduced = useReducedMotion();
  const label = `Switch to ${targetLabel}`;

  return (
    <Tooltip content={label} sticky>
      <Button
        variant="ghost"
        size="icon"
        className={WIDGET_HEADER_ACTION}
        aria-label={label}
        onClick={onToggle}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={targetKey}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: 90 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: "easeOut" }}
          >
            <Icon />
          </motion.span>
        </AnimatePresence>
      </Button>
    </Tooltip>
  );
}
