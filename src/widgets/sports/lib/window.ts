export const DAY_WINDOWS = ["today", "day", "week"] as const;
export type DayWindow = (typeof DAY_WINDOWS)[number];

export const DEFAULT_DAY_WINDOW: DayWindow = "today";

const SPAN_DAYS: Record<DayWindow, number> = { today: 0, day: 1, week: 3 };

export const LIVE_FLOOR_MS: Record<DayWindow, number> = {
  today: 15_000,
  day: 30_000,
  week: 60_000,
};

function stamp(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}${month}${day}`;
}

function shiftDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}

export function datesParam(window: DayWindow, now: Date): string | null {
  const span = SPAN_DAYS[window];
  if (span === 0) return null;
  return `${stamp(shiftDays(now, -span))}-${stamp(shiftDays(now, span))}`;
}
