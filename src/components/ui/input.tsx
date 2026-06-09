import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        `
          border-input bg-background/60
          placeholder:text-muted-foreground/60
          focus-visible:border-ring focus-visible:ring-ring/30
          flex h-8 w-full min-w-0 rounded-md border px-2.5 py-1 text-sm transition-colors
          outline-none
          focus-visible:ring-2
          disabled:cursor-not-allowed disabled:opacity-50
        `,
        className,
      )}
      {...props}
    />
  );
}

export { Input };
