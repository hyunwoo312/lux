export type SparklinePoint = { x: number; y: number };

export type SparklineChart = {
  points: SparklinePoint[];
  yFor: (value: number) => number;
};

export function sparklineChart(
  series: number[],
  width: number,
  height: number,
  baseline?: number,
): SparklineChart | null {
  if (series.length < 2) return null;
  const values = baseline != null ? [...series, baseline] : series;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const yFor = (value: number) =>
    range === 0 ? height / 2 : height - ((value - min) / range) * height;
  const step = width / (series.length - 1);
  const points = series.map((value, index) => ({ x: index * step, y: yFor(value) }));
  return { points, yFor };
}
