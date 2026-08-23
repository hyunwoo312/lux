import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        `
          border-input bg-background/60
          placeholder:text-ink-4
          focus-ring w-full min-w-0 resize-none rounded-lg border px-3 py-2 text-body
          transition-colors
          disabled:cursor-not-allowed disabled:opacity-50
        `,
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
