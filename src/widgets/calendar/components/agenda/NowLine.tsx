import type { CSSProperties, Ref } from "react";
import { cn } from "@/lib/utils";

type NowLineProps = {
  label: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
};

export function NowLine({ label, className, style, ref }: NowLineProps) {
  return (
    <div
      ref={ref}
      style={style}
      className={cn("pointer-events-none z-20 flex items-center gap-1", className)}
    >
      <span className="sr-only">Current time {label}</span>
      <span aria-hidden className="bg-primary size-1.5 flex-none rounded-full" />
      <span aria-hidden className="bg-primary/70 h-px flex-1" />
    </div>
  );
}
