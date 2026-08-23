import { describe, expect, it } from "vitest";
import { aggregateBars } from "@/widgets/stocks/lib/chart";
import type { PriceBar } from "@/widgets/stocks/types";

function bar(time: number, open: number, high: number, low: number, close: number, volume = 1) {
  return { time, open, high, low, close, volume } satisfies PriceBar;
}

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
