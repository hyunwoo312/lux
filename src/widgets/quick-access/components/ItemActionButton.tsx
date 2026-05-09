import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
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
      whileHover={reduced ? undefined : { scale: 1.18 }}
      whileTap={reduced ? undefined : { scale: 0.85 }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className={cn(
        "text-muted-foreground/50 hover:text-foreground cursor-pointer p-0.5 transition-colors",
        "[&_svg]:size-3.5",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
