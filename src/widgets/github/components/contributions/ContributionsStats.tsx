import type { ReactNode } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { windowLabel } from "@/widgets/github/lib/heatmap";
import type { ContributionsData, DateRange } from "@/widgets/github/types";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function Stats({
  data,
  total,
  weeks,
}: {
  data: ContributionsData;
  total: number;
  weeks: number;
}) {
  const perDay = weeks > 0 ? total / (weeks * 7) : 0;

  return (
    <div className="flex items-end justify-between gap-2 px-1">
      <div className="flex min-w-0 flex-col">
        <span className="text-ink text-title font-semibold tabular-nums">
          {total.toLocaleString()}
        </span>
        <span className="text-ink-3 truncate text-micro">
          {windowLabel(weeks)} · {perDay.toFixed(1)} / day
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Stat
          label="Current"
          value={data.currentStreak}
          detail={streakDetail(data.currentStreak, data.currentStreakRange)}
          accent
          icon={<Flame className="size-3" />}
        />
        <Stat
          label="Longest"
          value={data.longestStreak}
          detail={streakDetail(data.longestStreak, data.longestStreakRange)}
        />
        {data.bestDay && (
          <Stat
            label="Best"
            value={data.bestDay.count}
            detail={`${data.bestDay.count} on ${formatDay(data.bestDay.date)}`}
          />
        )}
      </div>
    </div>
  );
}

function formatDay(date: string): string {
  const monthName = MONTHS_SHORT[Number(date.slice(5, 7)) - 1] ?? "";
  return `${monthName} ${Number(date.slice(8, 10))}`;
}

function streakDetail(days: number, range: DateRange | undefined): string {
  if (days === 0) return "No streak yet";
  const length = `${days} ${days === 1 ? "day" : "days"}`;
  if (!range) return length;
  return `${length} · ${formatDay(range.from)} – ${formatDay(range.to)}`;
}

function Stat({
  label,
  value,
  detail,
  accent,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  accent?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Tooltip content={detail} prose>
      <div className="flex cursor-default flex-col items-end">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-body font-semibold tabular-nums",
            accent ? "text-primary" : "text-ink",
          )}
        >
          {icon}
          {value}
        </span>
        <span className="text-ink-3 text-micro">{label}</span>
      </div>
    </Tooltip>
  );
}
