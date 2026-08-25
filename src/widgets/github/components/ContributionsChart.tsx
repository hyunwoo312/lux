import { memo, useState } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  heatmapWidth,
  LEGEND_H,
  MONTH_ROW_H,
  WEEKDAY_W,
  windowLabel,
  type HeatmapMetrics,
} from "@/widgets/github/lib/heatmap";
import type { ContributionDay } from "@/widgets/github/types";

const LEVEL_CLASS = ["heat-0", "heat-1", "heat-2", "heat-3", "heat-4"];
const LEGEND_SWATCH = 9;

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
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = [
  { id: "sun", label: "" },
  { id: "mon", label: "Mon" },
  { id: "tue", label: "" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "" },
];

function monthLabelsFor(weeks: ContributionDay[][]): (string | null)[] {
  const labels: (string | null)[] = [];
  let lastMonth = -1;
  let lastLabelCol = -3;
  weeks.forEach((week, index) => {
    const first = week[0];
    if (!first) {
      labels.push(null);
      return;
    }
    const month = Number(first.date.slice(5, 7)) - 1;
    if (month !== lastMonth) {
      lastMonth = month;
      if (index - lastLabelCol >= 3) {
        labels.push(MONTHS_SHORT[month] ?? null);
        lastLabelCol = index;
        return;
      }
    }
    labels.push(null);
  });
  return labels;
}

function dayTitle(day: ContributionDay, todayKey: string): string {
  const monthName = MONTHS_FULL[Number(day.date.slice(5, 7)) - 1] ?? "";
  const dayNum = Number(day.date.slice(8, 10));
  const amount =
    day.count === 0
      ? "No contributions"
      : `${day.count} ${day.count === 1 ? "contribution" : "contributions"}`;
  const when = day.date === todayKey ? "today" : `on ${monthName} ${dayNum}`;
  return `${amount} ${when}.`;
}

type Tip = { text: string; x: number; y: number };

export function Heatmap({
  weeks,
  metrics,
  total,
  todayKey,
  login,
  newTab,
}: {
  weeks: ContributionDay[][];
  metrics: HeatmapMetrics;
  total: number;
  todayKey: string;
  login?: string;
  newTab?: boolean;
}) {
  const [tip, setTip] = useState<Tip | null>(null);

  const handleOver = (event: MouseEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-day]");
    if (!cell) {
      setTip(null);
      return;
    }
    const rect = cell.getBoundingClientRect();
    setTip({ text: cell.dataset.day ?? "", x: rect.left + rect.width / 2, y: rect.top });
  };

  const grid = <HeatmapGrid weeks={weeks} metrics={metrics} total={total} todayKey={todayKey} />;

  return (
    <div onMouseOver={handleOver} onMouseLeave={() => setTip(null)}>
      {login ? (
        <a
          href={`https://github.com/${encodeURIComponent(login)}?tab=overview`}
          target={newTab ? "_blank" : undefined}
          rel="noreferrer"
          aria-label={`Open ${login}'s contribution activity on GitHub`}
          className="focus-ring block w-fit rounded-md"
        >
          {grid}
        </a>
      ) : (
        grid
      )}
      {tip &&
        createPortal(
          <div
            className="
              bg-popover text-popover-foreground elev-3 z-tooltip pointer-events-none fixed
              -translate-x-1/2 -translate-y-full rounded-md px-2.5 py-1.5 text-micro font-medium
              whitespace-nowrap
            "
            style={{ left: tip.x, top: tip.y - 8 }}
          >
            {tip.text}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function HeatmapLegend({ metrics }: { metrics: HeatmapMetrics }) {
  return (
    <div
      className="text-ink-3 flex items-center justify-end text-micro"
      style={{ gap: metrics.gap, height: LEGEND_H, width: heatmapWidth(metrics) }}
    >
      <span>Less</span>
      {LEVEL_CLASS.map((level) => (
        <span
          key={level}
          aria-hidden
          className={cn("rounded-2xs", level)}
          style={{ width: LEGEND_SWATCH, height: LEGEND_SWATCH }}
        />
      ))}
      <span>More</span>
    </div>
  );
}

const HeatmapGrid = memo(function HeatmapGrid({
  weeks,
  metrics,
  total,
  todayKey,
}: {
  weeks: ContributionDay[][];
  metrics: HeatmapMetrics;
  total: number;
  todayKey: string;
}) {
  const { cell, gap, showWeekdays } = metrics;
  const shown = weeks.slice(-metrics.weeks);
  const showMonths = showWeekdays;
  const months = showMonths ? monthLabelsFor(shown) : [];

  return (
    <div
      role="img"
      aria-label={`Contribution heatmap: ${total.toLocaleString()} ${windowLabel(shown.length)}`}
      className="flex flex-col"
      style={{ gap }}
    >
      {showMonths && (
        <div className="flex" style={{ gap, height: MONTH_ROW_H }}>
          <div style={{ width: WEEKDAY_W }} />
          <div className="flex" style={{ gap }}>
            {shown.map((week, index) => (
              <div key={week[0]?.date ?? index} className="relative" style={{ width: cell }}>
                {months[index] && (
                  <span
                    className="
                      text-ink-3 absolute top-0 left-0 text-micro leading-none whitespace-nowrap
                    "
                  >
                    {months[index]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex" style={{ gap }}>
        {showWeekdays && (
          <div className="flex flex-col" style={{ width: WEEKDAY_W, gap }}>
            {WEEKDAYS.map((weekday) => (
              <span
                key={weekday.id}
                className="text-ink-3 flex items-center justify-end text-micro leading-none"
                style={{ height: cell }}
              >
                {weekday.label}
              </span>
            ))}
          </div>
        )}
        <div className="flex" style={{ gap }}>
          {shown.map((week, index) => (
            <div key={week[0]?.date ?? index} className="flex flex-col" style={{ gap }}>
              {week.map((day) => (
                <span
                  key={day.date}
                  data-day={dayTitle(day, todayKey)}
                  className={cn(
                    "rounded-2xs",
                    LEVEL_CLASS[day.level],
                    day.date === todayKey && "ring-ink-2 ring-1",
                  )}
                  style={{ width: cell, height: cell }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
