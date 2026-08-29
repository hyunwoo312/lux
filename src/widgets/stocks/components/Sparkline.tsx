import { useId } from "react";
import { cn } from "@/lib/utils";
import { useElementSize } from "@/hooks/useElementSize";
import { areaPath, chartGeometry, linePath } from "@/lib/chart";
import { changeTone } from "@/widgets/stocks/lib/quote";
import type { ChangeDirection } from "@/widgets/stocks/lib/quote";
import type { PricePoint } from "@/widgets/stocks/types";

type SparklineProps = {
  points: PricePoint[];
  direction: ChangeDirection;
  baseline?: number;
  className?: string;
};

export function Sparkline({ points, direction, baseline, className }: SparklineProps) {
  const gradientId = useId();
  const [ref, { width, height }] = useElementSize<HTMLSpanElement>();
  const geometry = chartGeometry(
    points.map((point) => point.close),
    width,
    height,
    { baseline },
  );
  const last = geometry?.points.at(-1);
  const baselineY = geometry && baseline != null ? geometry.yFor(baseline) : null;

  return (
    <span ref={ref} className={cn("relative block", className)} aria-hidden>
      {geometry && last ? (
        <svg className={cn("absolute inset-0 size-full", changeTone(direction))}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.24} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          {geometry.points.length > 1 && (
            <path d={areaPath(geometry.points, height)} fill={`url(#${gradientId})`} />
          )}
          {baselineY != null && (
            <>
              <line
                x1={0}
                y1={baselineY}
                x2={width}
                y2={baselineY}
                className="stroke-background"
                strokeWidth={3}
                strokeDasharray="2 3"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={0}
                y1={baselineY}
                x2={width}
                y2={baselineY}
                className="stroke-ink-3"
                strokeWidth={1}
                strokeDasharray="2 3"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
          {geometry.points.length > 1 && (
            <path
              d={linePath(geometry.points)}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <circle cx={last.x} cy={last.y} r={2} className="fill-current" />
        </svg>
      ) : null}
    </span>
  );
}
