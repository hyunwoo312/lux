import { describe, expect, it } from "vitest";
import { gridColumns, showsSparkline, tooltipLeft } from "@/widgets/stocks/lib/layout";

describe("showsSparkline", () => {
  it("drops the chart rather than drawing an unreadable one in a narrow widget", () => {
    expect(showsSparkline(266)).toBe(false);
  });

  it("draws it once the row can spare real width for it", () => {
    expect(showsSparkline(320)).toBe(true);
  });

  it("has nothing to show before the widget has been measured", () => {
    expect(showsSparkline(0)).toBe(false);
  });
});

describe("gridColumns", () => {
  it.each([
    [0, 1],
    [200, 1],
    [400, 2],
    [560, 3],
  ])("fits %spx into %s columns", (width, expected) => {
    expect(gridColumns(width)).toBe(expected);
  });

  it("never goes past three across, however wide the widget gets", () => {
    expect(gridColumns(2000)).toBe(3);
  });
});

describe("tooltipLeft", () => {
  it("centres the readout on the point it describes", () => {
    expect(tooltipLeft(150, 100, 300)).toBe(100);
  });

  it("keeps the readout inside the chart near the left edge", () => {
    expect(tooltipLeft(4, 100, 300)).toBe(0);
  });

  it("keeps the readout inside the chart near the right edge", () => {
    expect(tooltipLeft(298, 100, 300)).toBe(200);
  });

  it("pins a readout wider than the chart to the left rather than off both sides", () => {
    expect(tooltipLeft(150, 400, 300)).toBe(0);
  });

  it("falls back to the anchor before the readout has been measured", () => {
    expect(tooltipLeft(120, 0, 300)).toBe(120);
  });
});
