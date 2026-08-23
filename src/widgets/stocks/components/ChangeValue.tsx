import { Triangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatChange } from "@/widgets/stocks/lib/format";
import { changeTone, directionOf } from "@/widgets/stocks/lib/quote";
import type { ChangeMode } from "@/widgets/stocks/types";

const CHIP_FILL: Record<string, string> = {
  up: "bg-success text-success-foreground",
  down: "bg-destructive text-destructive-foreground",
  flat: "bg-foreground/10 text-ink-2",
};

type ChangeValueProps = {
  change: number;
  percent: number;
  mode: ChangeMode;
  variant?: "inline" | "chip";
  className?: string;
};

export function ChangeValue({
  change,
  percent,
  mode,
  variant = "inline",
  className,
}: ChangeValueProps) {
  const direction = directionOf(change);
  const chip = variant === "chip";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums slashed-zero",
        chip
          ? cn("rounded-sm px-1.5 py-0.5 text-caption font-semibold", CHIP_FILL[direction])
          : cn("text-caption", changeTone(direction)),
        className,
      )}
    >
      {direction !== "flat" && (
        <Triangle
          aria-hidden
          className={cn("size-2 shrink-0 fill-current", direction === "down" && "rotate-180")}
        />
      )}
      {formatChange(change, percent, mode)}
    </span>
  );
}
