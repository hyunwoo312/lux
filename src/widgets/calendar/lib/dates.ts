import { localDayKey } from "@/lib/clock";

export const WEEK_LENGTH = 7;
export const GRID_LENGTH = 42;

type WeekInfo = { firstDay: number };
type LocaleWeekInfo = Intl.Locale & { getWeekInfo?: () => WeekInfo; weekInfo?: WeekInfo };

const monthDayFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const dayFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric" });
const narrowWeekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });
const longWeekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "long" });

function resolveWeekStartDay(): number {
  try {
    const locale = new Intl.Locale(
      new Intl.DateTimeFormat().resolvedOptions().locale,
    ) as LocaleWeekInfo;
    const firstDay = locale.getWeekInfo?.().firstDay ?? locale.weekInfo?.firstDay;
    return typeof firstDay === "number" ? firstDay % WEEK_LENGTH : 0;
  } catch {
    return 0;
  }
}

const WEEK_START_DAY = resolveWeekStartDay();

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getMonthOffset(monthDate: Date, offset: number): Date {
  return new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1);
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function startOfWeek(date: Date): Date {
  const start = startOfDay(date);
  return addDays(start, -((start.getDay() - WEEK_START_DAY + WEEK_LENGTH) % WEEK_LENGTH));
}

export type WeekdayLabel = { narrow: string; long: string };

export const WEEKDAY_LABELS: WeekdayLabel[] = Array.from({ length: WEEK_LENGTH }, (_, index) => {
  const day = addDays(startOfWeek(new Date(2024, 0, 1)), index);
  return { narrow: narrowWeekdayFormatter.format(day), long: longWeekdayFormatter.format(day) };
});

export function getMonthGridDays(monthDate: Date): Date[] {
  const firstGridDay = startOfWeek(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));
  return Array.from({ length: GRID_LENGTH }, (_, index) => addDays(firstGridDay, index));
}

export function getRangeEndDate(startDate: Date, lookaheadDays: number): Date {
  return addDays(startDate, lookaheadDays - 1);
}

export function formatDayRange(start: Date, end: Date): string {
  if (localDayKey(start) === localDayKey(end)) return monthDayFormatter.format(start);
  if (start.getMonth() === end.getMonth()) {
    return `${monthDayFormatter.format(start)} – ${dayFormatter.format(end)}`;
  }
  return `${monthDayFormatter.format(start)} – ${monthDayFormatter.format(end)}`;
}
