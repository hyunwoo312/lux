import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrendMovement } from "@/widgets/news/types";

export function TrendMovementBadge({
  movement,
  onArt = false,
  className,
}: {
  movement: TrendMovement | null;
  onArt?: boolean;
  className?: string;
}) {
  if (!movement || movement.kind === "steady") return null;

  if (movement.kind === "new") {
    return (
      <span
        className={cn(
          `
            bg-primary text-primary-foreground rounded-sm px-1 py-px text-micro font-semibold
            tracking-wide uppercase
          `,
          className,
        )}
      >
        New
      </span>
    );
  }

  const rising = movement.kind === "up";
  const Icon = rising ? ChevronUp : ChevronDown;

  return (
    <span
      role="img"
      aria-label={`${rising ? "Up" : "Down"} ${movement.places} ${movement.places === 1 ? "place" : "places"}`}
      className={cn(
        "inline-flex items-center gap-0.5 text-micro tabular-nums",
        onArt ? "text-white drop-shadow-md" : rising ? "text-ink-2" : "text-ink-4",
        className,
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {movement.places}
    </span>
  );
}
