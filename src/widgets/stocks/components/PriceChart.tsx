import { useId, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { cn } from "@/lib/utils";
import { useElementSize } from "@/hooks/useElementSize";
import { areaPath, chartGeometry, linePath } from "@/lib/chart";
import { aggregateBars } from "@/widgets/stocks/lib/chart";
import { tooltipLeft } from "@/widgets/stocks/lib/layout";
import { changeTone, directionOf } from "@/widgets/stocks/lib/quote";
import type { ChangeDirection } from "@/widgets/stocks/lib/quote";
import { formatChartTime, formatNumber, formatVolume } from "@/widgets/stocks/lib/format";
import type { ChartStyle, Dividend, PriceBar, StockRange } from "@/widgets/stocks/types";

const MIN_CANDLE_SLOT = 4;
const VOLUME_SHARE = 0.22;
const VOLUME_MAX_HEIGHT = 44;
const BAND_GAP = 6;

type PriceChartProps = {
  bars: PriceBar[];
  direction: ChangeDirection;
  baseline?: number;
  style: ChartStyle;
  range: StockRange;
  priceHint: number;
  timeZone: string | null;
  dividends: Dividend[];
  className?: string;
};

export function PriceChart({
  bars,
  direction,
  baseline,
  style,
  range,
  priceHint,
  timeZone,
  dividends,
  className,
}: PriceChartProps) {
  const clock24h = useAppSettingsStore((state) => state.clock24h);
  const gradientId = useId();
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  const [tooltipRef, tooltip] = useElementSize<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const candles = style === "candle";
  const shown = candles ? aggregateBars(bars, Math.floor(width / MIN_CANDLE_SLOT)) : bars;
  const hasVolume = shown.some((bar) => bar.volume != null);
  const volumeHeight = hasVolume ? Math.min(VOLUME_MAX_HEIGHT, height * VOLUME_SHARE) : 0;
  const priceHeight = Math.max(0, height - volumeHeight - (hasVolume ? BAND_GAP : 0));

  const values = candles
    ? shown.flatMap((bar) => [bar.high, bar.low])
    : shown.map((bar) => bar.close);
  const geometry = chartGeometry(values, width, priceHeight, { baseline });
  const line = candles ? null : geometry;
  const slot = shown.length > 0 ? width / shown.length : 0;
  const candleWidth = Math.max(1, Math.min(slot - 1, 10));
  const xForBar = (index: number) => (candles ? index * slot + slot / 2 : (line?.xFor(index) ?? 0));

  const peakVolume = Math.max(1, ...shown.map((bar) => bar.volume ?? 0));
  const baselineY = geometry && baseline != null ? geometry.yFor(baseline) : null;

  const index = active != null && active < shown.length ? active : null;
  const bar = index != null ? shown[index] : undefined;

  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (shown.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;
    const position = candles
      ? Math.floor(fraction * shown.length)
      : Math.round(fraction * (shown.length - 1));
    setActive(Math.max(0, Math.min(shown.length - 1, position)));
  };

  const dividendByBar = new Map<number, number>();
  if (range !== "1d" && range !== "5d") {
    let cursor = 0;
    let current = shown[0];
    for (const dividend of dividends) {
      if (current === undefined) break;
      let next = shown[cursor + 1];
      while (
        next !== undefined &&
        Math.abs(next.time - dividend.time) < Math.abs(current.time - dividend.time)
      ) {
        cursor += 1;
        current = next;
        next = shown[cursor + 1];
      }
      dividendByBar.set(cursor, dividend.amount);
    }
  }

  return (
    <div ref={ref} className={cn("relative min-h-0", className)}>
      {geometry ? (
        <svg className={cn("absolute inset-0 size-full", changeTone(direction))} aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.2} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>

          {baselineY != null && (
            <>
              <line
                x1={0}
                y1={baselineY}
                x2={width}
                y2={baselineY}
                className="stroke-background"
                strokeWidth={3}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={0}
                y1={baselineY}
                x2={width}
                y2={baselineY}
                className="stroke-ink-3"
                strokeWidth={1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}

          {line && line.points.length > 1 && (
            <>
              <path d={areaPath(line.points, priceHeight)} fill={`url(#${gradientId})`} />
              <path
                d={linePath(line.points)}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}

          {candles &&
            shown.map((entry, entryIndex) => {
              const x = xForBar(entryIndex);
              const rising = entry.close >= entry.open;
              const top = geometry.yFor(Math.max(entry.open, entry.close));
              const bottom = geometry.yFor(Math.min(entry.open, entry.close));
              return (
                <g
                  key={entry.time}
                  className={rising ? "text-success" : "text-destructive"}
                  stroke="currentColor"
                  fill="currentColor"
                >
                  <line
                    x1={x}
                    y1={geometry.yFor(entry.high)}
                    x2={x}
                    y2={geometry.yFor(entry.low)}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                  <rect
                    x={x - candleWidth / 2}
                    y={top}
                    width={candleWidth}
                    height={Math.max(1, bottom - top)}
                    stroke="none"
                  />
                </g>
              );
            })}

          {hasVolume &&
            shown.map((entry, entryIndex) => {
              const value = entry.volume ?? 0;
              const barHeight = (value / peakVolume) * volumeHeight;
              return (
                <rect
                  key={entry.time}
                  x={xForBar(entryIndex) - candleWidth / 2}
                  y={height - barHeight}
                  width={candleWidth}
                  height={barHeight}
                  className={cn(
                    "opacity-35",
                    entry.close >= entry.open ? "fill-success" : "fill-destructive",
                  )}
                />
              );
            })}

          {[...dividendByBar.keys()].map((barIndex) => (
            <circle
              key={barIndex}
              cx={xForBar(barIndex)}
              cy={priceHeight - 3}
              r={2}
              className="stroke-background fill-ink-3"
              strokeWidth={1.5}
            />
          ))}

          {bar && index != null && (
            <>
              <line
                x1={xForBar(index)}
                y1={0}
                x2={xForBar(index)}
                y2={height}
                className="stroke-background"
                strokeWidth={3}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={xForBar(index)}
                y1={0}
                x2={xForBar(index)}
                y2={height}
                className="stroke-ink-3"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              {!candles && (
                <circle
                  cx={xForBar(index)}
                  cy={geometry.yFor(bar.close)}
                  r={3.5}
                  className="stroke-background fill-current"
                  strokeWidth={2}
                />
              )}
            </>
          )}
        </svg>
      ) : null}

      <div
        className="absolute inset-0"
        onPointerMove={handleMove}
        onPointerLeave={() => setActive(null)}
      />

      {bar && index != null ? (
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute top-0 z-10 w-fit whitespace-nowrap"
          style={{ left: `${tooltipLeft(xForBar(index), tooltip.width, width)}px` }}
        >
          <div className="bg-card border-border/70 rounded-md border px-1.5 py-1 shadow-sm">
            <div
              className="
                text-ink flex items-baseline gap-1 text-caption font-medium tabular-nums
                slashed-zero
              "
            >
              {candles ? (
                <>
                  <span className="text-ink-3">O</span>
                  {formatNumber(bar.open, priceHint)}
                  <span className="text-ink-3">C</span>
                  <span className={changeTone(directionOf(bar.close - bar.open))}>
                    {formatNumber(bar.close, priceHint)}
                  </span>
                </>
              ) : (
                formatNumber(bar.close, priceHint)
              )}
            </div>
            <div className="text-ink-3 flex items-baseline gap-1.5 text-micro tabular-nums">
              <span>{formatChartTime(bar.time, range, !clock24h, timeZone)}</span>
              {bar.volume != null && <span>Vol {formatVolume(bar.volume)}</span>}
              {dividendByBar.has(index) && (
                <span className="text-ink-2">
                  Div {formatNumber(dividendByBar.get(index) ?? 0)}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
