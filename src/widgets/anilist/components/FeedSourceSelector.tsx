import { ConfigSegmented } from "@/components/config/Config";
import { cn } from "@/lib/utils";
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
  const options = FEED_SOURCES.map((source) => {
    const active = source === value;
    const count = counts[source];
    return {
      value: source,
      label: (
        <span className="flex min-w-0 items-center gap-1.5">
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
      ),
    };
  });
  return (
    <ConfigSegmented
      label="Feed source"
      value={value}
      options={options}
      onChange={onChange}
      fit="line"
    />
  );
}
