import { useId, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/utils";
import { useElementSize } from "@/hooks/useElementSize";
import { sparklineChart } from "@/widgets/stocks/lib/sparkline";
import { formatChartTime, formatPrice } from "@/widgets/stocks/lib/format";
import type { StockRange } from "@/widgets/stocks/types";

type SparklineProps = {
  series: number[];
  timestamps: number[];
  currency: string;
  range: StockRange;
  tone: string;
  baseline?: number;
  variant?: "compact" | "detail";
  className?: string;
};

export function Sparkline({
  series,
  timestamps,
  currency,
  range,
  tone,
  baseline,
  variant = "compact",
  className,
}: SparklineProps) {
  const detail = variant === "detail";
  const gradientId = useId();
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const chart = width > 0 && height > 0 ? sparklineChart(series, width, height, baseline) : null;
  const points = chart
    ? chart.points.map((entry) => `${entry.x.toFixed(2)},${entry.y.toFixed(2)}`).join(" ")
    : "";
  const baselineY = chart && baseline != null ? chart.yFor(baseline) : null;
  const idx = active != null && chart && active < chart.points.length ? active : null;
  const point = idx != null && chart ? chart.points[idx] : undefined;

  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!chart) return;
    const count = chart.points.length;
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;
    setActive(Math.max(0, Math.min(count - 1, Math.round(fraction * (count - 1)))));
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      {chart ? (
        <svg className={cn("absolute inset-0 h-full w-full", tone)} aria-hidden>
          {detail ? (
            <>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
              </defs>
              <polygon
                points={`0,${height} ${points} ${width},${height}`}
                fill={`url(#${gradientId})`}
              />
            </>
          ) : null}
          {baselineY != null ? (
            <line
              x1={0}
              y1={baselineY}
              x2={width}
              y2={baselineY}
              className="stroke-muted-foreground/25"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {point ? (
            <>
              <line
                x1={point.x}
                y1={0}
                x2={point.x}
                y2={height}
                className="stroke-muted-foreground/40"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={4}
                className="fill-current stroke-background"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : null}
        </svg>
      ) : null}

      <div
        className="absolute inset-0"
        onPointerMove={handleMove}
        onPointerLeave={() => setActive(null)}
      />

      {point && idx != null ? (
        <div
          className={cn(
            "pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap",
            detail ? "bottom-full mb-1" : "top-0",
          )}
          style={{ left: `${Math.min(Math.max(point.x, 28), Math.max(width - 28, 28))}px` }}
        >
          <div
            className="
              bg-card flex flex-col items-center rounded px-1.5 py-0.5 leading-tight shadow-sm
            "
          >
            <span className="text-foreground text-xs font-medium tabular-nums">
              {formatPrice(series[idx] ?? 0, currency)}
            </span>
            {detail && (timestamps[idx] ?? 0) > 0 ? (
              <span className="text-muted-foreground text-xs tabular-nums">
                {formatChartTime(timestamps[idx] ?? 0, range)}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
