import { localDayKey } from "@/lib/clock";
import { peekEntry } from "@/widgets/core/sharedResource";
import { readPolled, refreshPolledResource } from "@/widgets/core/usePolledResource";
import { fetchScoreboardDay, parseCachedScoreboard } from "@/widgets/sports/lib/espn";
import { STATE_ORDER, type Match } from "@/widgets/sports/types";

export type Scoreboard = { matches: Match[]; missingDays: string[] };

export function scoreboardDayKey(path: string, date: string): string {
  return `sports:v1:day:${path}:${date}`;
}

export function refreshScoreboardDays(path: string, range: string): void {
  scoreboardDays(range).forEach((date) => refreshPolledResource(scoreboardDayKey(path, date)));
}

export function scoreboardDays(range: string): string[] {
  const [start, end] = range.split("-");
  if (!start || !end || !/^\d{8}$/.test(start) || !/^\d{8}$/.test(end))
    throw new Error("Invalid scoreboard date range");
  const first = new Date(
    Date.UTC(Number(start.slice(0, 4)), Number(start.slice(4, 6)) - 1, Number(start.slice(6)) - 1),
  );
  const last = new Date(
    Date.UTC(Number(end.slice(0, 4)), Number(end.slice(4, 6)) - 1, Number(end.slice(6)) + 1),
  );
  const days: string[] = [];
  while (first <= last && days.length < 17) {
    days.push(first.toISOString().slice(0, 10).replaceAll("-", ""));
    first.setUTCDate(first.getUTCDate() + 1);
  }
  return days;
}

export async function fetchScoreboardWindow(
  path: string,
  range: string,
  signal?: AbortSignal,
): Promise<Scoreboard> {
  const days = scoreboardDays(range);
  const pages: Match[][] = [];
  const missingDays: string[] = [];
  const errors: unknown[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(3, days.length) }, async () => {
      while (next < days.length) {
        signal?.throwIfAborted();
        const index = next++,
          date = days[index]!;
        const cacheKey = scoreboardDayKey(path, date);
        const cached = peekEntry<Match[]>("polled", cacheKey);
        if (
          cached &&
          !cached.data.some((match) => match.state === "in") &&
          Date.now() - cached.at < 15 * 60_000
        ) {
          pages[index] = cached.data;
          continue;
        }
        try {
          pages[index] = await readPolled({
            widget: "sports",
            cacheKey,
            intervalMs: 15_000,
            persist: false,
            parse: parseCachedScoreboard,
            fetch: (requestSignal) => fetchScoreboardDay(path, date, requestSignal),
          });
          if (
            cached &&
            Date.now() - cached.at >= 15_000 &&
            peekEntry<Match[]>("polled", cacheKey)?.at === cached.at
          )
            missingDays.push(date);
        } catch (error) {
          signal?.throwIfAborted();
          errors.push(error);
          missingDays.push(date);
          pages[index] = cached?.data ?? [];
        }
      }
    }),
  );
  signal?.throwIfAborted();
  if (
    errors.length > 0 &&
    missingDays.length === days.length &&
    pages.every((page) => page.length === 0)
  )
    throw errors[0];
  const [start, end] = range.split("-");
  const matches = [...new Map(pages.flat().map((match) => [match.id, match])).values()]
    .filter((match) => {
      const date = localDayKey(new Date(match.startsAt)).replaceAll("-", "");
      return date >= start! && date <= end!;
    })
    .sort(
      (a, b) =>
        STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
        Date.parse(a.startsAt) - Date.parse(b.startsAt),
    );
  return { matches, missingDays: missingDays.sort() };
}

export function parseCachedWindow(raw: unknown): Scoreboard | null {
  if (!raw || typeof raw !== "object" || !("matches" in raw) || !("missingDays" in raw))
    return null;
  const matches = parseCachedScoreboard(raw.matches);
  return matches &&
    Array.isArray(raw.missingDays) &&
    raw.missingDays.every((day) => typeof day === "string")
    ? { matches, missingDays: raw.missingDays }
    : null;
}
