import type { PricePoint, SparkSeries } from "@/widgets/stocks/types";

export function periodReturn(points: PricePoint[], boundary: number): number | null {
  const first = points.findLast((point) => point.time <= boundary);
  const last = points.at(-1);
  if (!first || !last || first.time >= last.time || first.close <= 0) return null;
  return ((last.close - first.close) / first.close) * 100;
}

export function compareSeries(series: SparkSeries[]): SparkSeries[] {
  if (series.length < 2 || series.some((entry) => entry.points.length < 2)) return [];
  const maps = series.map(
    (entry) => new Map(entry.points.map((point) => [point.time, point.close])),
  );
  const times = [...(maps[0]?.keys() ?? [])]
    .filter((time) => maps.every((map) => map.has(time)))
    .sort((a, b) => a - b);
  const baseTime = times[0];
  if (times.length < 2 || baseTime == null) return [];
  if (maps.some((map) => (map.get(baseTime) ?? 0) <= 0)) return [];
  return series.map((entry, index) => {
    const map = maps[index]!;
    const base = map.get(baseTime)!;
    const points = times.map((time) => ({ time, close: ((map.get(time)! - base) / base) * 100 }));
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
