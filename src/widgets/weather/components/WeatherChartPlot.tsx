import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { areaPath, linePath } from "@/lib/chart";
import { enterTween, fade } from "@/lib/motion";
import {
  formatForecastValue,
  type ForecastMetric,
  type ForecastUnitLabels,
} from "@/widgets/weather/lib/forecast-metrics";
import type { ForecastChart } from "@/widgets/weather/lib/forecast-chart";

type Props = { chart: ForecastChart; metric: ForecastMetric; units: ForecastUnitLabels };
export function WeatherChartPlot({ chart, metric, units }: Props) {
  const reduced = useReducedMotion();
  const gradientId = useId();
  const { hours, width, height, values, geometry, xFor, segments, selection } = chart;
  if (!geometry) return null;
  return (
    <motion.svg
      {...fade(reduced, "fast")}
      width={width}
      height={height}
      className="absolute inset-x-0 top-0"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.18} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <g className={metric === "rain" ? "text-info" : "text-ink-2"}>
        {[0.25, 0.75].map((position) => (
          <line
            key={position}
            x1={0}
            x2={width}
            y1={height * position}
            y2={height * position}
            className="stroke-border/50"
            strokeDasharray="2 4"
          />
        ))}
        {metric === "rain"
          ? values.map((value, index) => {
              if (value === null) return null;
              const barWidth = Math.max(1, width / Math.max(1, hours.length) / 1.5);
              const left = Math.max(0, xFor(index) - barWidth / 2);
              return (
                <rect
                  key={hours[index]?.time}
                  x={left}
                  y={geometry.yFor(value)}
                  width={Math.min(barWidth, Math.max(0, width - left))}
                  height={Math.max(0, geometry.yFor(0) - geometry.yFor(value))}
                  rx={2}
                  fill="currentColor"
                  opacity={0.5}
                />
              );
            })
          : segments.map(({ points, key }) => (
              <g key={key}>
                <path d={areaPath(points, height)} fill={`url(#${gradientId})`} />
                <path
                  d={linePath(points)}
                  fill="none"
                  className="stroke-background"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={linePath(points)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {points.length === 1 && (
                  <circle
                    cx={points[0]?.x}
                    cy={points[0]?.y}
                    r={2}
                    fill="currentColor"
                    className="stroke-background"
                    strokeWidth={2}
                  />
                )}
              </g>
            ))}
        <text x={3} y={10} className="text-ink-3 fill-current text-micro">
          {formatForecastValue(geometry.max, metric, units)}
        </text>
        {geometry.min !== geometry.max && (
          <text x={3} y={height - 2} className="text-ink-3 fill-current text-micro">
            {formatForecastValue(geometry.min, metric, units)}
          </text>
        )}
      </g>
      {selection && (
        <g className="text-primary">
          <motion.line
            initial={false}
            animate={{ x1: selection.x, x2: selection.x }}
            transition={enterTween(reduced, "instant")}
            y1={0}
            y2={height}
            stroke="currentColor"
            strokeOpacity={0.45}
            strokeDasharray="3 3"
          />
          {selection.y !== null && (
            <motion.circle
              initial={false}
              animate={{ cx: selection.x, cy: selection.y ?? 0 }}
              transition={enterTween(reduced, "instant")}
              r={3.5}
              fill="currentColor"
              className="stroke-background"
              strokeWidth={2}
            />
          )}
        </g>
      )}
    </motion.svg>
  );
}
