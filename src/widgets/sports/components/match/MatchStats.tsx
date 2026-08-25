import { cn } from "@/lib/utils";
import type { MatchStat } from "@/widgets/sports/types";

function share(value: number, total: number): string {
  return `${total > 0 ? (value / total) * 100 : 50}%`;
}

export function MatchStats({ stats }: { stats: MatchStat[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {stats.map((stat) => {
        const total = stat.home + stat.away;
        const suffix = stat.suffix ?? "";
        return (
          <li key={stat.label} className="flex flex-col gap-1">
            <div className="text-micro flex items-center gap-2">
              <span className="text-ink w-8 shrink-0 text-right tabular-nums">
                {stat.away}
                {suffix}
              </span>
              <span className="text-ink-3 min-w-0 flex-1 truncate text-center">{stat.label}</span>
              <span className="text-ink w-8 shrink-0 tabular-nums">
                {stat.home}
                {suffix}
              </span>
            </div>
            <div aria-hidden className="flex h-1 items-stretch gap-0.5">
              <span className="bg-foreground/8 flex flex-1 justify-end overflow-hidden rounded-full">
                <span
                  className={cn(
                    "h-full rounded-full",
                    stat.away >= stat.home ? "bg-primary" : "bg-ink-4",
                  )}
                  style={{ width: share(stat.away, total) }}
                />
              </span>
              <span className="bg-foreground/8 flex flex-1 overflow-hidden rounded-full">
                <span
                  className={cn(
                    "h-full rounded-full",
                    stat.home >= stat.away ? "bg-primary" : "bg-ink-4",
                  )}
                  style={{ width: share(stat.home, total) }}
                />
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
