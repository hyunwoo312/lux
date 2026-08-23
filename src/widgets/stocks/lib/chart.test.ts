import { describe, expect, it } from "vitest";
import { aggregateBars, areaPath, chartGeometry, linePath } from "@/widgets/stocks/lib/chart";
import type { PriceBar } from "@/widgets/stocks/types";

function bar(time: number, open: number, high: number, low: number, close: number, volume = 1) {
  return { time, open, high, low, close, volume } satisfies PriceBar;
}

describe("chartGeometry", () => {
  it("keeps the highest and lowest points inside the box so the stroke is never clipped", () => {
    const geometry = chartGeometry([10, 20, 5], 100, 40, { inset: 2 });
    const ys = geometry?.points.map((point) => point.y) ?? [];
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...ys)).toBeLessThanOrEqual(38);
  });

  it("draws a single point in the middle rather than rendering nothing", () => {
    const geometry = chartGeometry([42], 100, 40);
    expect(geometry?.points).toEqual([{ x: 50, y: 20 }]);
  });

  it("has nothing to draw for an empty series", () => {
    expect(chartGeometry([], 100, 40)).toBeNull();
  });

  it("has nothing to draw before the container has been measured", () => {
    expect(chartGeometry([1, 2], 0, 0)).toBeNull();
  });

  it("centres a flat series instead of collapsing it to an edge", () => {
    const geometry = chartGeometry([7, 7, 7], 100, 40);
    expect(geometry?.points.map((point) => point.y)).toEqual([20, 20, 20]);
  });

  it("makes room for a baseline that sits outside the series", () => {
    const geometry = chartGeometry([10, 12], 100, 40, { baseline: 4 });
    expect(geometry?.min).toBe(4);
    expect(geometry?.yFor(4)).toBeGreaterThan(geometry?.yFor(10) ?? 0);
  });
});

describe("paths", () => {
  it("closes the area back down to the floor", () => {
    const path = areaPath(
      [
        { x: 0, y: 10 },
        { x: 10, y: 5 },
      ],
      40,
    );
    expect(path).toBe("M0 10 L10 5 L10 40 L0 40 Z");
  });

  it("has no area to fill without points", () => {
    expect(areaPath([], 40)).toBe("");
  });

  it("starts the line with a move and continues with draws", () => {
    expect(
      linePath([
        { x: 0, y: 1 },
        { x: 2, y: 3 },
      ]),
    ).toBe("M0 1 L2 3");
  });
});

describe("aggregateBars", () => {
  it("leaves a series alone when it already fits", () => {
    const bars = [bar(1, 1, 2, 0, 1)];
    expect(aggregateBars(bars, 10)).toBe(bars);
  });

  it("keeps the group's open, close, extremes and total volume", () => {
    const bars = [bar(1, 10, 12, 9, 11, 100), bar(2, 11, 15, 8, 14, 50)];
    expect(aggregateBars(bars, 1)).toEqual([
      { time: 1, open: 10, close: 14, high: 15, low: 8, volume: 150 },
    ]);
  });

  it("reports no volume when the group had none", () => {
    const bars = [bar(1, 1, 1, 1, 1), bar(2, 1, 1, 1, 1)];
    const grouped = aggregateBars(
      bars.map((entry) => ({ ...entry, volume: null })),
      1,
    );
    expect(grouped[0]?.volume).toBeNull();
  });
});
