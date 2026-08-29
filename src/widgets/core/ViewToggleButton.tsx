import { iconSwap } from "@/lib/motion";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/chromeStyles";
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
        size="icon-xs"
        className={WIDGET_HEADER_ACTION}
        aria-label={label}
        onClick={onToggle}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={targetKey} {...iconSwap(reduced, -1)}>
            <Icon />
          </motion.span>
        </AnimatePresence>
      </Button>
    </Tooltip>
  );
}
