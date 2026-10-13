import { describe, expect, it } from "vitest";
import { compareSeries, movingAverage, periodReturn } from "@/widgets/stocks/lib/analysis";
import { sparkKey } from "@/widgets/stocks/lib/cacheKeys";
import type { SparkSeries } from "@/widgets/stocks/types";

const series = (symbol: string, values: [number, number][]): SparkSeries => ({
  symbol,
  price: values.at(-1)?.[1] ?? 0,
  previousClose: 1,
  points: values.map(([time, close]) => ({ time, close })),
});

describe("watchlist analysis", () => {
  it("shares caches across manual order and duplicate symbols", () => {
    expect(sparkKey(["MSFT", "AAPL", "AAPL"], "1y")).toBe(sparkKey(["AAPL", "MSFT"], "1y"));
  });
  it("rebases different price levels on common timestamps without filling gaps", () => {
    const result = compareSeries([
      series("A", [
        [1, 50],
        [2, 100],
        [3, 110],
        [4, 120],
      ]),
      series("B", [
        [2, 10],
        [4, 9],
      ]),
    ]);
    expect(result.map((s) => s.points)).toEqual([
      [
        { time: 2, close: 0 },
        { time: 4, close: 20 },
      ],
      [
        { time: 2, close: 0 },
        { time: 4, close: -10 },
      ],
    ]);
  });
  it("rejects disjoint, one-point and zero-base comparisons", () => {
    expect(compareSeries([series("A", [[1, 10]]), series("B", [[2, 20]])])).toEqual([]);
    expect(
      compareSeries([
        series("A", [
          [1, 0],
          [2, 1],
        ]),
        series("B", [
          [1, 10],
          [2, 20],
        ]),
      ]),
    ).toEqual([]);
  });
  it("uses the last available close at or before a boundary and rejects short history", () => {
    const points = series("A", [
      [100, 10],
      [200, 12],
      [300, 15],
    ]).points;
    expect(periodReturn(points, 250)).toBe(25);
    expect(periodReturn(points, 50)).toBeNull();
    expect(periodReturn(points, 400)).toBeNull();
  });
  it("warms up moving averages and seeds EMA with the simple average", () => {
    const points = series("A", [
      [1, 10],
      [2, 20],
      [3, 30],
      [4, 40],
    ]).points;
    expect(movingAverage(points, 3, "sma")).toEqual([
      { time: 3, close: 20 },
      { time: 4, close: 30 },
    ]);
    expect(movingAverage(points, 3, "ema")).toEqual([
      { time: 3, close: 20 },
      { time: 4, close: 30 },
    ]);
    expect(movingAverage(points.slice(0, 2), 3, "sma")).toEqual([]);
  });
});
