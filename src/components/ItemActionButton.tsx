import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { TAP } from "@/lib/motion";
import { cn } from "@/lib/utils";

type ItemActionButtonProps = {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
};

export function ItemActionButton({ label, onClick, className, children }: ItemActionButtonProps) {
  const reduced = useReducedMotion();

  return (
    <motion.button
      type="button"
      {...(reduced ? {} : TAP.icon)}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className={cn(
        "focus-ring text-ink-2 hover:text-ink cursor-pointer p-0.5 drop-shadow-sm transition-colors",
        "[&_svg]:size-3.5",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
