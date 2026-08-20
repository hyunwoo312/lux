import type { Match } from "@/widgets/sports/types";

const DAY_FORMAT: Intl.DateTimeFormatOptions = { weekday: "short" };
const DATE_FORMAT: Intl.DateTimeFormatOptions = { month: "numeric", day: "numeric" };

const SOON_MS = 60 * 60_000;
const WITHIN_WEEK_MS = 6 * 24 * 60 * 60_000;

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function matchStatus(match: Match, now: number, hour12: boolean): string {
  if (match.state !== "pre") return match.detail;

  const start = new Date(match.startsAt);
  if (Number.isNaN(start.getTime())) return match.detail;

  const until = start.getTime() - now;
  if (until > 0 && until <= SOON_MS) return `in ${Math.max(1, Math.round(until / 60_000))}m`;

  const time = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12,
  });
  if (isSameDay(start, new Date(now))) return time;
  if (until > 0 && until <= WITHIN_WEEK_MS) {
    return `${start.toLocaleDateString(undefined, DAY_FORMAT)} ${time}`;
  }
  return `${start.toLocaleDateString(undefined, DATE_FORMAT)} ${time}`;
}

const OFFSEASON_MS = 7 * 24 * 60 * 60_000;

export function offseasonStart(matches: Match[], now: number): Date | null {
  if (matches.length === 0) return null;
  if (!matches.every((match) => match.state === "pre")) return null;

  const starts = matches
    .map((match) => Date.parse(match.startsAt))
    .filter((time) => !Number.isNaN(time));
  if (starts.length === 0) return null;

  const soonest = Math.min(...starts);
  return soonest - now >= OFFSEASON_MS ? new Date(soonest) : null;
}
