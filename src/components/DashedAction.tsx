import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function DashedAction({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        `
          press-row focus-ring border-border/60 text-ink-3
          hover:border-foreground/40 hover:text-ink
          flex w-full cursor-pointer items-center gap-3 rounded-lg border border-dashed
          transition-colors
          disabled:cursor-default disabled:opacity-60
        `,
        className,
      )}
      {...props}
    />
  );
}
