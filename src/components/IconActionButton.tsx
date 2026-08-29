import { tap } from "@/lib/motion";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type IconActionButtonProps = {
  icon: LucideIcon;
  label: string;
  tooltip: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  spinning?: boolean;
};

export function IconActionButton({
  icon: Icon,
  label,
  tooltip,
  onClick,
  disabled = false,
  spinning = false,
}: IconActionButtonProps) {
  const reduced = useReducedMotion();

  return (
    <Tooltip content={tooltip}>
      <motion.button
        type="button"
        onClick={disabled ? undefined : onClick}
        aria-disabled={disabled || undefined}
        aria-label={label}
        {...tap(reduced || disabled, "control")}
        className="
          focus-ring cursor-pointer text-ink-3
          hover:text-ink
          inline-flex size-8 items-center justify-center rounded-md transition-colors
          aria-disabled:cursor-not-allowed aria-disabled:opacity-40
          [&_svg]:size-4 [&_svg]:shrink-0
        "
      >
        <Icon className={cn(spinning && "animate-spin")} />
      </motion.button>
    </Tooltip>
  );
}
