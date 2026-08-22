import { describe, expect, it } from "vitest";
import {
  heatmapHeight,
  heatmapMetrics,
  localDayKey,
  windowLabel,
} from "@/widgets/github/lib/heatmap";

const WIDGET_INNER = { w6: 248, w8: 348, w10: 448, wide: 1000 };

describe("heatmapMetrics", () => {
  it("keeps every cell square", () => {
    for (const width of Object.values(WIDGET_INNER)) {
      const metrics = heatmapMetrics(width);
      expect(metrics.cell).toBeGreaterThanOrEqual(5);
      expect(metrics.cell).toBeLessThanOrEqual(11);
    }
  });

  it("spends the available width on bigger cells rather than more weeks", () => {
    expect(heatmapMetrics(WIDGET_INNER.w6).cell).toBeLessThan(heatmapMetrics(WIDGET_INNER.w8).cell);
    expect(heatmapMetrics(WIDGET_INNER.w8).cell).toBeLessThan(
      heatmapMetrics(WIDGET_INNER.w10).cell,
    );
  });

  it("never shrinks the window below half a year", () => {
    for (const width of Object.values(WIDGET_INNER)) {
      expect(heatmapMetrics(width).weeks).toBeGreaterThanOrEqual(26);
    }
  });

  it("shows a full year once the widget is wide enough for one at full size", () => {
    const metrics = heatmapMetrics(WIDGET_INNER.wide);
    expect(metrics.weeks).toBe(53);
    expect(metrics.cell).toBe(11);
  });

  it("never claims more than a year even on a very wide widget", () => {
    expect(heatmapMetrics(5000).weeks).toBe(53);
  });

  it("gives the chart a taller band than the width-driven cells used to allow", () => {
    expect(heatmapHeight(heatmapMetrics(WIDGET_INNER.w8))).toBeGreaterThan(80);
  });

  it("drops the weekday gutter only once the cells are too short to label", () => {
    expect(heatmapMetrics(WIDGET_INNER.w10).showWeekdays).toBe(true);
    expect(heatmapMetrics(WIDGET_INNER.w6).showWeekdays).toBe(false);
  });

  it("falls back to the smallest cell when even half a year will not fit", () => {
    const metrics = heatmapMetrics(100);
    expect(metrics.cell).toBe(5);
    expect(metrics.weeks).toBeGreaterThan(0);
    expect(metrics.weeks).toBeLessThan(26);
  });

  it("assumes a full year before the container has been measured", () => {
    expect(heatmapMetrics(0).weeks).toBe(53);
  });
});

describe("windowLabel", () => {
  it("only claims a year when a year is on screen", () => {
    expect(windowLabel(53)).toBe("contributions in the last year");
  });

  it("says how much is actually shown when the window is short", () => {
    expect(windowLabel(27)).toBe("contributions in the last 6 months");
    expect(windowLabel(4)).toBe("contributions in the last 4 weeks");
  });
});

describe("localDayKey", () => {
  it("reads the day in the viewer's own timezone, not UTC", () => {
    expect(localDayKey(new Date(2026, 7, 23, 23, 30))).toBe("2026-08-23");
    expect(localDayKey(new Date(2026, 0, 5, 0, 15))).toBe("2026-01-05");
  });
});
