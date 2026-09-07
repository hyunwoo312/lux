import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        `
          border-border/60 bg-card text-ink rounded-xs border px-1.5 py-0.5 font-sans text-caption
          font-medium
        `,
        className,
      )}
    >
      {children}
    </kbd>
  );
}
