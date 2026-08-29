import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { springCrisp } from "@/lib/motion";
import { FEED_SOURCES, type FeedSource } from "@/widgets/anilist/types";

const LABELS: Record<FeedSource, string> = {
  following: "Following",
  notifications: "Notifications",
};

type FeedSourceSelectorProps = {
  value: FeedSource;
  counts: Record<FeedSource, number>;
  onChange: (value: FeedSource) => void;
};

export function FeedSourceSelector({ value, counts, onChange }: FeedSourceSelectorProps) {
  const layoutId = useId();
  const reduced = useReducedMotion();

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next === "following" || next === "notifications") onChange(next);
      }}
      aria-label="Feed source"
      className="bg-foreground/5 min-w-0 gap-0.5 rounded-md p-0.5"
    >
      {FEED_SOURCES.map((source) => {
        const active = source === value;
        const count = counts[source];
        return (
          <ToggleGroupItem key={source} value={source} variant="segmented" className="min-w-0">
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={springCrisp(reduced)}
                className="bg-primary absolute inset-0 rounded-sm"
              />
            )}
            <span className="relative z-10 flex min-w-0 items-center gap-1.5">
              <span className="truncate">{LABELS[source]}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "shrink-0 rounded-full text-micro font-semibold tabular-nums",
                    active
                      ? "text-primary-foreground/80"
                      : "bg-primary text-primary-foreground px-1.5 py-0.5",
                  )}
                >
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
