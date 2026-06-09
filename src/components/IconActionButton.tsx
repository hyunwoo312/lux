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
  const interactive = !reduced && !disabled;

  return (
    <Tooltip content={tooltip}>
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        whileHover={interactive ? { scale: 1.18 } : undefined}
        whileTap={interactive ? { scale: 0.82 } : undefined}
        transition={{ type: "spring", stiffness: 420, damping: 16 }}
        className="
          text-muted-foreground
          hover:text-foreground
          inline-flex size-8 items-center justify-center rounded-md outline-none transition-colors
          focus-visible:ring-ring focus-visible:ring-2
          disabled:pointer-events-none disabled:opacity-40
          [&_svg]:size-4 [&_svg]:shrink-0
        "
      >
        <Icon className={cn(spinning && "animate-spin")} />
      </motion.button>
    </Tooltip>
  );
}
