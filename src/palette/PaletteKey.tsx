import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PaletteKey({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        `
          border-border text-ink-2 text-micro rounded-full border px-1.5 py-0.5 font-sans
          font-semibold tracking-wide uppercase
        `,
        className,
      )}
    >
      {children}
    </kbd>
  );
}
