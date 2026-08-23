import type { PriceBar } from "@/widgets/stocks/types";

export type ChartPoint = { x: number; y: number };

export type ChartGeometry = {
  points: ChartPoint[];
  xFor: (index: number) => number;
  yFor: (value: number) => number;
  min: number;
  max: number;
};

type GeometryOptions = { baseline?: number; inset?: number };

export function chartGeometry(
  values: number[],
  width: number,
  height: number,
  { baseline, inset = 2 }: GeometryOptions = {},
): ChartGeometry | null {
  if (values.length === 0 || width <= 0 || height <= 0) return null;
  const considered = baseline != null ? [...values, baseline] : values;
  const min = Math.min(...considered);
  const max = Math.max(...considered);
  const span = max - min;
  const top = Math.min(inset, height / 2);
  const usable = Math.max(0, height - top * 2);
  const yFor = (value: number) =>
    span === 0 ? height / 2 : top + usable - ((value - min) / span) * usable;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const xFor = (index: number) => (values.length > 1 ? index * step : width / 2);
  return {
    points: values.map((value, index) => ({ x: xFor(index), y: yFor(value) })),
    xFor,
    yFor,
    min,
    max,
  };
}

export function linePath(points: ChartPoint[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

export function areaPath(points: ChartPoint[], height: number): string {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return "";
  return `${linePath(points)} L${last.x} ${height} L${first.x} ${height} Z`;
}

export function aggregateBars(bars: PriceBar[], maxCount: number): PriceBar[] {
  if (maxCount <= 0 || bars.length <= maxCount) return bars;
  const groupSize = Math.ceil(bars.length / maxCount);
  const grouped: PriceBar[] = [];
  for (let start = 0; start < bars.length; start += groupSize) {
    const slice = bars.slice(start, start + groupSize);
    const first = slice[0];
    const last = slice.at(-1);
    if (!first || !last) continue;
    const volumes = slice
      .map((bar) => bar.volume)
      .filter((value): value is number => value != null);
    grouped.push({
      time: first.time,
      open: first.open,
      close: last.close,
      high: Math.max(...slice.map((bar) => bar.high)),
      low: Math.min(...slice.map((bar) => bar.low)),
      volume: volumes.length > 0 ? volumes.reduce((sum, value) => sum + value, 0) : null,
    });
  }
  return grouped;
}
