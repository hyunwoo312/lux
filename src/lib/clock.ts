export function clockOptions(hour12: boolean): Intl.DateTimeFormatOptions {
  return { hour: hour12 ? "numeric" : "2-digit", minute: "2-digit", hour12 };
}

export function formatClock(date: Date, hour12: boolean): string {
  return new Intl.DateTimeFormat(undefined, clockOptions(hour12)).format(date);
}

export function formatHourMark(date: Date, hour12: boolean): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: hour12 ? "numeric" : "2-digit",
    hour12,
  }).format(date);
}
