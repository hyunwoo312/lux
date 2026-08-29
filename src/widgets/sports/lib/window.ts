import { localDayKey } from "@/lib/clock";
import type { Sport } from "@/widgets/sports/lib/leagues";

export const DAY_WINDOWS = ["today", "day", "week", "wide"] as const;
export type DayWindow = (typeof DAY_WINDOWS)[number];

export const DEFAULT_DAY_WINDOW: DayWindow = "day";

export const DAY_WINDOW_LABEL: Record<DayWindow, string> = {
  today: "Today",
  day: "± 1 day",
  week: "± 3 days",
  wide: "± 7 days",
};

const SPAN_DAYS: Record<DayWindow, number> = { today: 0, day: 1, week: 3, wide: 7 };

const WINDOW_FLOOR_MS: Record<DayWindow, number> = {
  today: 15_000,
  day: 30_000,
  week: 60_000,
  wide: 120_000,
};

const SPORT_FLOOR_MS: Record<Sport, number> = {
  basketball: 15_000,
  hockey: 20_000,
  football: 30_000,
  baseball: 30_000,
  soccer: 30_000,
  tennis: 30_000,
  golf: 60_000,
};

export function livePollFloorMs(sport: Sport, window: DayWindow): number {
  return Math.max(SPORT_FLOOR_MS[sport], WINDOW_FLOOR_MS[window]);
}

function shiftDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}

function stamp(date: Date): string {
  return localDayKey(date).replaceAll("-", "");
}

export function datesParam(window: DayWindow, now: Date): string | null {
  const span = SPAN_DAYS[window];
  if (span === 0) return null;
  return `${stamp(shiftDays(now, -span))}-${stamp(shiftDays(now, span))}`;
}
