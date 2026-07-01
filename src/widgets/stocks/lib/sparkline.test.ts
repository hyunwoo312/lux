import { describe, expect, it } from "vitest";
import { sparklineChart } from "@/widgets/stocks/lib/sparkline";

describe("sparklineChart", () => {
  it("returns null for fewer than two values", () => {
    expect(sparklineChart([], 10, 10)).toBeNull();
    expect(sparklineChart([5], 10, 10)).toBeNull();
  });

  it("maps a rising series across the full height, inverted for SVG", () => {
    const chart = sparklineChart([0, 10], 10, 10);
    expect(chart?.points).toEqual([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
    ]);
  });

  it("centers a flat series", () => {
    expect(sparklineChart([5, 5], 10, 10)?.points).toEqual([
      { x: 0, y: 5 },
      { x: 10, y: 5 },
    ]);
  });

  it("includes the baseline in the vertical domain", () => {
    const chart = sparklineChart([10, 10], 10, 10, 0);
    expect(chart?.yFor(0)).toBe(10);
    expect(chart?.yFor(10)).toBe(0);
  });
});
