import {
  RANGE_INTERVAL,
  type PricePoint,
  type SparkSeries,
  type StockHistoryRange,
} from "@/widgets/stocks/types";

const DAY_SECONDS = 86_400;
const INTERVAL_SECONDS: Record<string, number> = {
  "5m": 300,
  "30m": 1_800,
  "1d": DAY_SECONDS,
  "1wk": 7 * DAY_SECONDS,
};

export const PERFORMANCE_PERIODS = ["1W", "1M", "YTD", "1Y"] as const;

export function performanceReturns(series: SparkSeries | undefined): (number | null)[] {
  const points = series?.points ?? [];
  const last = points.at(-1);
  if (!last) return PERFORMANCE_PERIODS.map(() => null);
  const date = new Date(last.time * 1000);
  const week = new Date(date);
  week.setUTCDate(week.getUTCDate() - 7);
  const month = new Date(date);
  month.setUTCDate(1);
  month.setUTCMonth(month.getUTCMonth() - 1);
  const monthEnd = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate();
  month.setUTCDate(Math.min(date.getUTCDate(), monthEnd));
  const year = new Date(date);
  year.setUTCDate(1);
  year.setUTCFullYear(year.getUTCFullYear() - 1);
  const yearMonthEnd = new Date(
    Date.UTC(year.getUTCFullYear(), year.getUTCMonth() + 1, 0),
  ).getUTCDate();
  year.setUTCDate(Math.min(date.getUTCDate(), yearMonthEnd));
  const ytd = Date.UTC(date.getUTCFullYear(), 0, 1) / 1000 - 1;
  return [week.getTime() / 1000, month.getTime() / 1000, ytd, year.getTime() / 1000].map(
    (boundary) => periodReturn(points, boundary),
  );
}

export function periodReturn(points: PricePoint[], boundary: number): number | null {
  const first = points.findLast((point) => point.time <= boundary);
  const last = points.at(-1);
  if (!first || !last || first.time >= last.time || first.close <= 0) return null;
  return ((last.close - first.close) / first.close) * 100;
}

export function compareSeries(series: SparkSeries[], range: StockHistoryRange): SparkSeries[] {
  if (series.length < 2 || series.some((entry) => entry.points.length < 2)) return [];
  const barSeconds = INTERVAL_SECONDS[RANGE_INTERVAL[range]] ?? DAY_SECONDS;
  const maps = series.map(
    (entry) =>
      new Map(entry.points.map((point) => [Math.floor(point.time / barSeconds), point] as const)),
  );
  const shared = maps[0]!;
  const bars = [...shared.keys()]
    .filter((bar) => maps.every((map) => map.has(bar)))
    .sort((a, b) => a - b);
  const baseBar = bars[0];
  if (bars.length < 2 || baseBar == null) return [];
  if (maps.some((map) => (map.get(baseBar)?.close ?? 0) <= 0)) return [];
  return series.map((entry, index) => {
    const map = maps[index]!;
    const base = map.get(baseBar)!.close;
    const points = bars.map((bar) => ({
      time: shared.get(bar)!.time,
      close: ((map.get(bar)!.close - base) / base) * 100,
    }));
    return { ...entry, previousClose: 0, price: points.at(-1)!.close, points };
  });
}

export function movingAverage(
  points: PricePoint[],
  period: number,
  kind: "sma" | "ema",
): PricePoint[] {
  if (period < 1 || !Number.isInteger(period)) return [];
  const result: PricePoint[] = [];
  let sum = 0;
  let previous = 0;
  for (let index = 0; index < points.length; index++) {
    const point = points[index]!;
    sum += point.close;
    if (index >= period) sum -= points[index - period]!.close;
    if (index < period - 1) continue;
    const close =
      kind === "sma" || index === period - 1
        ? sum / period
        : point.close * (2 / (period + 1)) + previous * (1 - 2 / (period + 1));
    result.push({ time: point.time, close });
    previous = close;
  }
  return result;
}
