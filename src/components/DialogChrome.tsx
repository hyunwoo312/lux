import type { ComponentProps, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { DialogCloseButton, DialogContent } from "@/components/ui/dialog";
import { springCrisp } from "@/lib/motion";
import { ROW } from "@/lib/row";
import { cn } from "@/lib/utils";

export const DIALOG_RAIL = `
  border-edge-2 bg-surface-2
  dark:bg-surface-raised
  flex shrink-0 flex-col border-r
`;

export function RailDialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      layout="flush"
      showClose={false}
      className={cn("h-[90dvh]", className)}
      {...props}
    >
      <div className="flex min-h-0 flex-1">{children}</div>
    </DialogContent>
  );
}

export function DialogHeaderBar({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-edge-2 flex h-12 shrink-0 items-center gap-3 border-b pr-3 pl-6",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
      <DialogCloseButton className="shrink-0" />
    </header>
  );
}

type RailItemProps = ComponentProps<"button"> & {
  active: boolean;
  layoutId: string;
  dense?: boolean;
};

export function RailItem({
  active,
  layoutId,
  dense = false,
  className,
  children,
  ...props
}: RailItemProps) {
  const reduced = useReducedMotion();
  return (
    <button
      type="button"
      className={cn(
        ROW.nav,
        active ? "text-ink" : "text-ink-3 hover:bg-accent/50 hover:text-ink",
        className,
      )}
      {...props}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          aria-hidden
          transition={springCrisp(reduced)}
          className="bg-primary/12 ring-primary/25 absolute inset-0 rounded-[inherit] ring-1"
        />
      )}
      <span
        className={cn("relative z-10 flex min-w-0 flex-1 items-center", dense ? "gap-1" : "gap-4")}
      >
        {children}
      </span>
    </button>
  );
}
