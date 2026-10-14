import { useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { SlidersHorizontal, Sunrise, Sunset } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import {
  formatIsoClock,
  formatWeekday,
  hoursForDate,
  resolveForecastDate,
  resolveForecastHour,
} from "@/widgets/weather/lib/forecast";
import {
  FORECAST_LABELS,
  FORECAST_METRICS,
  type ForecastMetric,
} from "@/widgets/weather/lib/forecast-metrics";
import { WeatherHourly } from "@/widgets/weather/components/WeatherHourly";
import { WeatherHourReading } from "@/widgets/weather/components/WeatherHourReading";
import { WeatherDaily } from "@/widgets/weather/components/WeatherDaily";
import { useWeather } from "@/widgets/weather/useWeatherStore";
import type { WeatherData } from "@/widgets/weather/types";

type Props = { data: WeatherData };

export function WeatherForecast({ data }: Props) {
  const forecastDays = useWeather((d) => d.forecastDays);
  const units = useWeather((d) => d.units);
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const reduced = useReducedMotion();
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [metric, setMetric] = useState<ForecastMetric>("temperature");
  const chart = useRef<HTMLDivElement>(null);
  const days = data.daily
    .filter((day) => day.date >= data.current.time.slice(0, 10))
    .slice(0, Number(forecastDays) + 1);
  const selectedDate = resolveForecastDate(days, date, data.current.time);
  const day = days.find((entry) => entry.date === selectedDate);
  const hours = selectedDate ? hoursForDate(data.hourly, selectedDate) : [];
  const selected = resolveForecastHour(hours, time, data.current.time);
  const today = selectedDate === data.current.time.slice(0, 10);
  const unitLabels = { ...data.unitLabels, temperature: units === "imperial" ? "°F" : "°C" };
  const dayLabel = today
    ? "Today"
    : selectedDate
      ? `${formatWeekday(selectedDate)} ${Number(selectedDate.slice(8))}`
      : "Forecast";

  return (
    <div className="flex flex-col gap-3">
      <div ref={chart} className="border-border/50 flex flex-col gap-2 border-t pt-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="text-ink-2 min-w-0 truncate text-caption font-medium">
            {dayLabel} <span className="text-ink-3 font-normal">· Forecast</span>
          </span>
          <Select
            value={metric}
            onValueChange={(value) => {
              if (FORECAST_METRICS.some((entry) => entry === value))
                setMetric(value as ForecastMetric);
            }}
          >
            <SelectTrigger
              aria-label="Forecast metric"
              className="text-ink-3 h-7 w-auto shrink-0 border-0 bg-transparent px-1.5"
            >
              <SlidersHorizontal aria-hidden />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="w-40">
              {FORECAST_METRICS.map((entry) => (
                <SelectItem key={entry} value={entry}>
                  {FORECAST_LABELS[entry]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <WeatherHourReading
          selected={selected}
          day={day}
          selectedDate={selectedDate}
          metric={metric}
          clock24h={clock24h}
          units={units}
          unitLabels={unitLabels}
        />
        <WeatherHourly
          hours={hours}
          metric={metric}
          selected={selected}
          units={unitLabels}
          currentTime={data.current.time}
          onSelect={(hour) => setTime(hour.time)}
          className="h-20 w-full"
        />
        {day && (day.sunrise || day.sunset || day.uvIndex != null) && (
          <div
            className={cn(
              "text-ink-3 text-micro tabular-nums",
              "flex flex-wrap items-center gap-x-3 gap-y-1",
            )}
          >
            {day.sunrise && (
              <span className="flex items-center gap-1">
                <Sunrise className="size-3" aria-hidden />
                <span className="sr-only">Sunrise </span>
                {formatIsoClock(day.sunrise, !clock24h)}
              </span>
            )}
            {day.sunset && (
              <span className="flex items-center gap-1">
                <Sunset className="size-3" aria-hidden />
                <span className="sr-only">Sunset </span>
                {formatIsoClock(day.sunset, !clock24h)}
              </span>
            )}
            {day.uvIndex != null && <span>Max UV {Math.round(day.uvIndex)}</span>}
          </div>
        )}
      </div>
      <WeatherDaily
        days={days}
        currentTime={data.current.time}
        selectedDate={selectedDate}
        onSelect={(nextDate) => {
          setDate(nextDate);
          setTime(null);
          const scroll = chart.current?.closest<HTMLElement>("[data-weather-scroll]");
          if (scroll && chart.current)
            scroll.scrollTo({
              top: Math.max(
                0,
                scroll.scrollTop +
                  chart.current.getBoundingClientRect().top -
                  scroll.getBoundingClientRect().top,
              ),
              behavior: reduced ? "auto" : "smooth",
            });
          chart.current
            ?.querySelector<HTMLElement>('[role="slider"]')
            ?.focus({ preventScroll: true });
        }}
      />
    </div>
  );
}
