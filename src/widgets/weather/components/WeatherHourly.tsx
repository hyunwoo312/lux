import { useId, type PointerEvent } from "react";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { WeatherChartPlot } from "@/widgets/weather/components/WeatherChartPlot";
import { forecastChart } from "@/widgets/weather/lib/forecast-chart";
import { cn } from "@/lib/utils";
import { useElementSize } from "@/hooks/useElementSize";
import { formatHour, hourlyTicks } from "@/widgets/weather/lib/forecast";
import {
  FORECAST_LABELS,
  formatForecastValue,
  type ForecastMetric,
  type ForecastUnitLabels,
} from "@/widgets/weather/lib/forecast-metrics";
import type { WeatherHour } from "@/widgets/weather/types";

type Props = {
  hours: WeatherHour[];
  metric: ForecastMetric;
  selected: WeatherHour | null;
  units: ForecastUnitLabels;
  currentTime: string;
  onSelect: (hour: WeatherHour) => void;
  className?: string;
};

export function WeatherHourly({
  hours,
  metric,
  selected,
  units,
  currentTime,
  onSelect,
  className,
}: Props) {
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const helpId = useId();
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  const chart = forecastChart(hours, metric, width, Math.max(0, height - 18), selected);
  const { selectedIndex, selectedValue, xFor } = chart;
  const { ticks } = hourlyTicks(hours, xFor, clock24h, currentTime);
  const inspect = (event: PointerEvent<HTMLDivElement>) => {
    if (!hours.length || width <= 0) return;
    const x = event.clientX - event.currentTarget.getBoundingClientRect().left;
    const index = chart.indexAt(x);
    const hour = hours[index];
    if (hour && hour.time !== selected?.time) onSelect(hour);
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={hours.length ? 0 : -1}
      aria-label={`${FORECAST_LABELS[metric]} hourly forecast`}
      aria-describedby={helpId}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, hours.length - 1)}
      aria-valuenow={selectedIndex}
      aria-valuetext={
        selected
          ? `${formatHour(selected.time, !clock24h)}, ${formatForecastValue(selectedValue, metric, units)}`
          : "No hourly forecast"
      }
      onPointerDown={(event) => {
        event.currentTarget.focus({ preventScroll: true });
        inspect(event);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={inspect}
      onKeyDown={(event) => {
        const step =
          event.key === "ArrowRight" || event.key === "ArrowUp"
            ? 1
            : event.key === "ArrowLeft" || event.key === "ArrowDown"
              ? -1
              : 0;
        const jump = event.key === "Home" ? 0 : event.key === "End" ? hours.length - 1 : null;
        if (!step && jump === null) return;
        event.preventDefault();
        const hour = hours[Math.min(hours.length - 1, Math.max(0, jump ?? selectedIndex + step))];
        if (hour) onSelect(hour);
      }}
      className={cn("focus-ring relative touch-pan-y rounded-md", className)}
    >
      <span id={helpId} className="sr-only">
        Hours use this location's time. Use arrow keys to inspect hours, Home for the first hour,
        and End for the last.
      </span>
      {chart.geometry ? (
        <>
          <WeatherChartPlot key={chart.key} chart={chart} metric={metric} units={units} />
          <div className="absolute inset-x-0 bottom-0 h-3.5">
            {ticks.map((tick) => (
              <span
                key={tick.key}
                className={cn(
                  "text-ink-3 absolute text-micro whitespace-nowrap",
                  tick.x <= 26
                    ? "translate-x-0"
                    : tick.x >= width - 26
                      ? "-translate-x-full"
                      : "-translate-x-1/2",
                )}
                style={{ left: tick.x }}
              >
                {tick.label}
              </span>
            ))}
          </div>
        </>
      ) : !chart.hasValues ? (
        <p className="text-ink-3 flex h-full items-center justify-center text-caption">
          {hours.length
            ? `${FORECAST_LABELS[metric]} data unavailable`
            : "No hourly forecast for this day"}
        </p>
      ) : null}
    </div>
  );
}
