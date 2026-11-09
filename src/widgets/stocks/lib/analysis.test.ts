import { describe, expect, it } from "vitest";
import {
  compareSeries,
  movingAverage,
  periodReturn,
  performanceReturns,
} from "@/widgets/stocks/lib/analysis";
import { sparkKey } from "@/widgets/stocks/lib/cacheKeys";
import type { SparkSeries } from "@/widgets/stocks/types";

const DAY = 86_400;

const series = (symbol: string, values: [number, number][]): SparkSeries => ({
  symbol,
  price: values.at(-1)?.[1] ?? 0,
  previousClose: 1,
  points: values.map(([time, close]) => ({ time, close })),
});

describe("watchlist analysis", () => {
  it("uses the prior February's last day for a leap-day annual return", () => {
    const time = (date: string) => Date.parse(`${date}T21:00:00Z`) / 1000;
    const result = performanceReturns(
      series("A", [
        [time("2023-02-28"), 100],
        [time("2023-03-01"), 200],
        [time("2024-02-29"), 150],
      ]),
    );
    expect(result[3]).toBe(50);
    expect(performanceReturns(undefined)).toEqual([null, null, null, null]);
  });
  it("shares caches across manual order and duplicate symbols", () => {
    expect(sparkKey(["MSFT", "AAPL", "AAPL"], "1y")).toBe(sparkKey(["AAPL", "MSFT"], "1y"));
  });
  it("rebases different price levels on common bars without filling gaps", () => {
    const result = compareSeries(
      [
        series("A", [
          [DAY, 50],
          [2 * DAY, 100],
          [3 * DAY, 110],
          [4 * DAY, 120],
        ]),
        series("B", [
          [2 * DAY, 10],
          [4 * DAY, 9],
        ]),
      ],
      "1y",
    );
    expect(result.map((s) => s.points)).toEqual([
      [
        { time: 2 * DAY, close: 0 },
        { time: 4 * DAY, close: 20 },
      ],
      [
        { time: 2 * DAY, close: 0 },
        { time: 4 * DAY, close: -10 },
      ],
    ]);
  });
  it("matches daily bars by day when markets open at different hours", () => {
    const open = (date: string, clock: string) => Date.parse(`${date}T${clock}Z`) / 1000;
    const [spy, tokyo] = compareSeries(
      [
        series("SPY", [
          [open("2026-03-02", "14:30:00"), 100],
          [open("2026-03-03", "14:30:00"), 110],
        ]),
        series("7203.T", [
          [open("2026-03-02", "00:00:00"), 50],
          [open("2026-03-03", "00:00:00"), 45],
        ]),
      ],
      "1y",
    );
    expect(spy?.points.map((point) => point.close)).toEqual([0, 10]);
    expect(tokyo?.points.map((point) => point.close)).toEqual([0, -10]);
    expect(tokyo?.points.map((point) => point.time)).toEqual(spy?.points.map((p) => p.time));
  });
  it("matches weekly bars across a five-year comparison", () => {
    const monday = Date.parse("2026-03-02T00:00:00Z") / 1000;
    const week = 7 * DAY;
    const lines = compareSeries(
      [
        series("SPY", [
          [monday + 14 * 3600, 100],
          [monday + week + 14 * 3600, 120],
        ]),
        series("VOD.L", [
          [monday + 8 * 3600, 10],
          [monday + week + 8 * 3600, 11],
        ]),
      ],
      "5y",
    );
    expect(lines[1]?.points.map((point) => point.close)).toEqual([0, 10]);
  });
  it("keeps intraday bars of different markets apart", () => {
    expect(
      compareSeries(
        [
          series("SPY", [
            [52_200, 1],
            [52_500, 2],
          ]),
          series("7203.T", [
            [600, 1],
            [900, 2],
          ]),
        ],
        "1d",
      ),
    ).toEqual([]);
  });
  it("rejects disjoint, one-point and zero-base comparisons", () => {
    expect(compareSeries([series("A", [[DAY, 10]]), series("B", [[2 * DAY, 20]])], "1y")).toEqual(
      [],
    );
    expect(
      compareSeries(
        [
          series("A", [
            [DAY, 0],
            [2 * DAY, 1],
          ]),
          series("B", [
            [DAY, 10],
            [2 * DAY, 20],
          ]),
        ],
        "1y",
      ),
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
