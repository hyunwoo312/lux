import type { PriceBar } from "@/widgets/stocks/types";

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
