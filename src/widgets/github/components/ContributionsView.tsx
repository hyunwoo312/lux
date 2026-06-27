import { memo, useEffect, useMemo, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useElementSize, type ElementSize } from "@/hooks/useElementSize";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { fetchContributions } from "@/widgets/github/lib/github-api";
import { ActivityLedger } from "@/widgets/github/components/ActivityLedger";
import { GithubPlaceholder } from "@/widgets/github/components/GithubPlaceholder";
import { useGithubStore } from "@/widgets/github/useGithubStore";
import { useGithubSync } from "@/widgets/github/useGithubSync";
import type { ContributionDay, ContributionsData } from "@/widgets/github/types";

const REFRESH_MS = 30 * 60 * 1000;
const CELL = 11;
const GAP = 3;
const COLUMN = CELL + GAP;
const WEEKDAY_W = 22;
const MONTH_ROW_H = 14;
const GRID_H = 7 * CELL + 6 * GAP;
const LEDGER_MIN = 72;

const LEVEL_CLASS = [
  "bg-foreground/10",
  "bg-primary/30",
  "bg-primary/50",
  "bg-primary/75",
  "bg-primary",
];

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

export function ContributionsView({ enabled }: { enabled: boolean }) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const persisted = useGithubStore((s) => s.contributions);
  const setContributions = useGithubStore((s) => s.setContributions);
  const showPrivate = useGithubStore((s) => s.showPrivate);
  const newTab = useGithubStore((s) => s.openBehavior === "newTab");
  const { state, isRefreshing, refresh } = usePolledResource(fetchContributions, {
    enabled,
    intervalMs: REFRESH_MS,
    cacheKey: "github:contributions",
  });
  useGithubSync(refresh, isRefreshing);

  const liveData = state.status === "success" ? state.data : null;
  useEffect(() => {
    if (liveData) setContributions(liveData);
  }, [liveData, setContributions]);

  const data = liveData ?? (state.status === "empty" ? null : persisted);
  const ledgerActivity = useMemo(
    () => (data?.activity ?? []).filter((entry) => showPrivate || !entry.isPrivate),
    [data?.activity, showPrivate],
  );
  const ledgerTotals = useMemo(() => {
    if (showPrivate) return data?.totals;
    return ledgerActivity.reduce(
      (acc, entry) => ({
        commits: acc.commits + entry.commits,
        prs: acc.prs + entry.prs,
        issues: acc.issues + entry.issues,
        reviews: acc.reviews + entry.reviews,
      }),
      { commits: 0, prs: 0, issues: 0, reviews: 0 },
    );
  }, [showPrivate, data?.totals, ledgerActivity]);

  if (state.status === "empty" && !liveData)
    return <GithubPlaceholder>No contributions yet.</GithubPlaceholder>;

  if (!data) {
    return state.status === "error" ? (
      <GithubPlaceholder>Couldn’t load contributions.</GithubPlaceholder>
    ) : (
      <GithubPlaceholder>Loading contributions…</GithubPlaceholder>
    );
  }

  const showLedger = size.height >= GRID_H + MONTH_ROW_H + LEDGER_MIN && ledgerActivity.length > 0;

  return (
    <div className="flex h-full flex-col gap-3 p-1">
      <Stats data={data} />
      <div ref={ref} className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="shrink-0">
          <Heatmap weeks={data.weeks} size={size} />
        </div>
        {showLedger && (
          <div className="border-border/50 min-h-0 flex-1 border-t pt-2">
            <ActivityLedger
              activity={ledgerActivity}
              totals={ledgerTotals}
              login={data.login}
              newTab={newTab}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Stats({ data }: { data: ContributionsData }) {
  return (
    <div className="flex items-end justify-between gap-2 px-1">
      <div className="flex flex-col">
        <span className="text-foreground text-lg font-semibold tabular-nums">
          {data.total.toLocaleString()}
        </span>
        <span className="text-muted-foreground text-2xs">contributions in the last year</span>
      </div>
      <div className="flex items-center gap-3">
        <Stat
          label="Current"
          value={data.currentStreak}
          accent
          icon={<Flame className="size-3" />}
        />
        <Stat label="Longest" value={data.longestStreak} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-end">
      <span
        className={cn(
          "inline-flex items-center gap-1 text-sm font-semibold tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {icon}
        {value}
      </span>
      <span className="text-muted-foreground text-2xs">{label}</span>
    </div>
  );
}

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

function dayTitle(day: ContributionDay): string {
  const monthName = MONTHS_FULL[Number(day.date.slice(5, 7)) - 1] ?? "";
  const dayNum = Number(day.date.slice(8, 10));
  const amount =
    day.count === 0
      ? "No contributions"
      : `${day.count} ${day.count === 1 ? "contribution" : "contributions"}`;
  return `${amount} on ${monthName} ${dayNum}.`;
}

type Tip = { text: string; x: number; y: number };

function Heatmap({ weeks, size }: { weeks: ContributionDay[][]; size: ElementSize }) {
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

  return (
    <div onMouseOver={handleOver} onMouseLeave={() => setTip(null)}>
      <HeatmapGrid weeks={weeks} size={size} />
      {tip &&
        createPortal(
          <div
            className="
              border-border bg-card text-foreground pointer-events-none fixed z-[100]
              -translate-x-1/2 -translate-y-full rounded-md border px-2 py-1 text-xs
              whitespace-nowrap shadow-md
            "
            style={{ left: tip.x, top: tip.y - 6 }}
          >
            {tip.text}
          </div>,
          document.body,
        )}
    </div>
  );
}

const HeatmapGrid = memo(function HeatmapGrid({
  weeks,
  size,
}: {
  weeks: ContributionDay[][];
  size: ElementSize;
}) {
  const available = size.width - WEEKDAY_W - GAP;
  const maxWeeks =
    size.width > 0 ? Math.max(1, Math.floor((available + GAP) / COLUMN)) : weeks.length;
  const shown = weeks.slice(-maxWeeks);
  const showMonths = size.height >= GRID_H + MONTH_ROW_H;
  const months = showMonths ? monthLabelsFor(shown) : [];

  return (
    <div className="flex flex-col" style={{ gap: GAP }}>
      {showMonths && (
        <div className="flex" style={{ gap: GAP, height: MONTH_ROW_H }}>
          <div style={{ width: WEEKDAY_W }} />
          <div className="flex" style={{ gap: GAP }}>
            {shown.map((week, index) => (
              <div key={week[0]?.date ?? index} className="relative" style={{ width: CELL }}>
                {months[index] && (
                  <span
                    className="
                      text-muted-foreground absolute top-0 left-0 text-[9px] leading-none
                      whitespace-nowrap
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
      <div className="flex" style={{ gap: GAP }}>
        <div className="flex flex-col" style={{ width: WEEKDAY_W, gap: GAP }}>
          {WEEKDAYS.map((weekday) => (
            <span
              key={weekday.id}
              className="
                text-muted-foreground flex items-center justify-end text-[9px] leading-none
              "
              style={{ height: CELL }}
            >
              {weekday.label}
            </span>
          ))}
        </div>
        <div className="flex" style={{ gap: GAP }}>
          {shown.map((week, index) => (
            <div key={week[0]?.date ?? index} className="flex flex-col" style={{ gap: GAP }}>
              {week.map((day) => (
                <span
                  key={day.date}
                  data-day={dayTitle(day)}
                  className={cn("rounded-[2px]", LEVEL_CLASS[day.level])}
                  style={{ width: CELL, height: CELL }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
