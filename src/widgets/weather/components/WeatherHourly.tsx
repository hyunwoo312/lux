import { useId } from "react";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { areaPath, chartGeometry, linePath } from "@/lib/chart";
import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";
import { useElementSize } from "@/hooks/useElementSize";
import { formatHour, formatTemperature, formatWeekday } from "@/widgets/weather/lib/forecast";
import type { WeatherHour } from "@/widgets/weather/types";

const PRECIP_BAND = 14;
const LABEL_BAND = 14;
const TICK_EVERY = 6;
const MIN_TICK_GAP = 38;
const LABEL_HEIGHT = 12;
const EDGE_ANCHOR = 26;
const MAX_PRECIP = 100;
const PRECIP_MIN_CHANCE = 20;
const PRECIP_MIN_HEIGHT = 3;

type WeatherHourlyProps = {
  hours: WeatherHour[];
  className?: string;
};

export function WeatherHourly({ hours, className }: WeatherHourlyProps) {
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const gradientId = useId();
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();

  const chartHeight = Math.max(0, height - PRECIP_BAND - LABEL_BAND);
  const geometry = chartGeometry(
    hours.map((hour) => hour.temperature),
    width,
    chartHeight,
    { inset: 10 },
  );
  const step = hours.length > 1 ? width / (hours.length - 1) : width;
  const barWidth = Math.max(1, step - 1);

  const coldest = geometry ? hours.findIndex((hour) => hour.temperature === geometry.min) : -1;
  const warmest =
    geometry && geometry.max > geometry.min
      ? hours.findIndex((hour) => hour.temperature === geometry.max)
      : -1;

  const candidates = hours.flatMap((hour, index) => {
    const midnight = index > 0 && hour.time.slice(11, 13) === "00";
    const rank = index === 0 ? 0 : midnight ? 1 : 2;
    if (rank === 2 && index % TICK_EVERY !== 0) return [];
    return [
      {
        key: hour.time,
        rank,
        x: geometry?.xFor(index) ?? 0,
        midnight,
        label:
          index === 0
            ? "Now"
            : midnight
              ? formatWeekday(hour.time.slice(0, 10))
              : formatHour(hour.time, !clock24h),
      },
    ];
  });

  const ticks = candidates
    .slice()
    .sort((a, b) => a.rank - b.rank || a.x - b.x)
    .reduce<typeof candidates>((kept, tick) => {
      if (kept.some((other) => Math.abs(other.x - tick.x) < MIN_TICK_GAP)) return kept;
      kept.push(tick);
      return kept;
    }, [])
    .sort((a, b) => a.x - b.x);

  const labelTop = (index: number, above: boolean) => {
    const y = geometry?.points[index]?.y ?? 0;
    const target = above ? y - LABEL_HEIGHT - 2 : y + 4;
    return Math.min(Math.max(target, 0), Math.max(0, chartHeight - LABEL_HEIGHT));
  };

  return (
    <div
      ref={ref}
      role="img"
      aria-label={
        geometry
          ? `Temperature over the next ${hours.length} hours, ` +
            `${formatTemperature(geometry.min)} to ${formatTemperature(geometry.max)}`
          : "Hourly forecast"
      }
      className={cn("relative", className)}
    >
      {geometry ? (
        <>
          <svg className="absolute inset-x-0 top-0" width={width} height={chartHeight} aria-hidden>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
            </defs>
            <g className="text-ink-2">
              {candidates
                .filter((tick) => tick.midnight)
                .map((tick) => (
                  <line
                    key={`divider-${tick.key}`}
                    x1={tick.x}
                    y1={0}
                    x2={tick.x}
                    y2={chartHeight}
                    className="stroke-border"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              <path d={areaPath(geometry.points, chartHeight)} fill={`url(#${gradientId})`} />
              <path
                d={linePath(geometry.points)}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </svg>

          <svg
            className="text-info absolute inset-x-0"
            style={{ top: chartHeight }}
            width={width}
            height={PRECIP_BAND}
            aria-hidden
          >
            {hours.map((hour, index) => {
              const value = Math.min(MAX_PRECIP, hour.precipitationProbability);
              if (value < PRECIP_MIN_CHANCE) return null;
              const centre = geometry.xFor(index);
              const left = Math.max(0, centre - barWidth / 2);
              const right = Math.min(width, centre + barWidth / 2);
              const barHeight = Math.max(PRECIP_MIN_HEIGHT, (value / MAX_PRECIP) * PRECIP_BAND);
              return (
                <rect
                  key={hour.time}
                  x={left}
                  y={PRECIP_BAND - barHeight}
                  width={Math.max(1, right - left)}
                  height={barHeight}
                  className="fill-current opacity-45"
                />
              );
            })}
          </svg>

          {[coldest, warmest].map((index, slot) => {
            const hour = index >= 0 ? hours[index] : undefined;
            if (!hour) return null;
            return (
              <span
                key={slot === 0 ? "min" : "max"}
                className={cn(
                  `
                    pointer-events-none absolute -translate-x-1/2 text-micro tabular-nums
                    slashed-zero
                  `,
                  slot === 0 ? "text-ink-3" : "text-ink",
                )}
                style={{
                  left: Math.min(Math.max(geometry.xFor(index), 14), Math.max(width - 14, 14)),
                  top: labelTop(index, slot === 1),
                }}
              >
                {formatTemperature(hour.temperature)}
              </span>
            );
          })}

          <div className="absolute inset-x-0 bottom-0" style={{ height: LABEL_BAND }}>
            {ticks.map((tick) => (
              <span
                key={tick.key}
                className={cn(
                  TYPE.rowMeta,
                  "absolute whitespace-nowrap",
                  tick.x <= EDGE_ANCHOR
                    ? "translate-x-0"
                    : tick.x >= width - EDGE_ANCHOR
                      ? "-translate-x-full"
                      : "-translate-x-1/2",
                  tick.midnight && "text-ink-3",
                )}
                style={{ left: tick.x }}
              >
                {tick.label}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
