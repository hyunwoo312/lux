export function clockFormatter(hour12: boolean): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(undefined, {
    hour: hour12 ? "numeric" : "2-digit",
    minute: "2-digit",
    hour12,
  });
}

export function formatClock(date: Date, hour12: boolean): string {
  return clockFormatter(hour12).format(date);
}

export function formatHourMark(date: Date, hour12: boolean): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: hour12 ? "numeric" : "2-digit",
    hour12,
  }).format(date);
}

export const CLOCK_DATE_FORMATS = ["off", "weekday", "date", "weekdayDate", "full"] as const;
export type ClockDateFormat = (typeof CLOCK_DATE_FORMATS)[number];

const DATE_OPTIONS: Record<ClockDateFormat, Intl.DateTimeFormatOptions | null> = {
  off: null,
  weekday: { weekday: "long" },
  date: { month: "short", day: "numeric" },
  weekdayDate: { weekday: "short", month: "short", day: "numeric" },
  full: { weekday: "short", month: "short", day: "numeric", year: "numeric" },
};

export function formatClockDate(date: Date, format: ClockDateFormat): string {
  const options = DATE_OPTIONS[format];
  return options === null ? "" : new Intl.DateTimeFormat(undefined, options).format(date);
}
