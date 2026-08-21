import { Droplets, Navigation, Sunrise, Sunset, Umbrella, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import { TYPE } from "@/lib/type";
import {
  findImminentPrecip,
  formatClock,
  formatTemperature,
  windCardinal,
} from "@/widgets/weather/lib/forecast";
import { wmoInfo } from "@/widgets/weather/lib/wmo";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { WeatherIcon } from "@/widgets/weather/components/WeatherIcon";
import { useWeather } from "@/widgets/weather/useWeatherStore";
import type { WeatherData, WeatherMetric, WeatherRainAlert } from "@/widgets/weather/types";

const RAIN_THRESHOLD: Record<Exclude<WeatherRainAlert, "off">, number> = {
  chance: 30,
  likely: 50,
};

type WeatherCurrentProps = {
  data: WeatherData;
  name: string;
};

export function WeatherCurrent({ data, name }: WeatherCurrentProps) {
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const metrics = useWeather((d) => d.metrics);
  const rainAlert = useWeather((d) => d.rainAlert);
  const { current, today, hourly, sunrise, sunset, uvIndex, unitLabels } = data;
  const condition = wmoInfo(current.weatherCode, current.isDay);
  const imminent =
    rainAlert === "off"
      ? null
      : findImminentPrecip(hourly, current.time, { threshold: RAIN_THRESHOLD[rainAlert] });
  const visible = metrics.filter((metric) => {
    if (metric === "uv") return uvIndex !== null;
    if (metric === "sunrise") return Boolean(sunrise);
    if (metric === "sunset") return Boolean(sunset);
    return true;
  });
  const shows = (metric: WeatherMetric) => visible.includes(metric);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-ink truncate pr-8 text-body font-medium">{name}</span>
      <div className="flex items-center gap-3">
        <WeatherIcon
          code={current.weatherCode}
          isDay={current.isDay}
          className="text-ink size-12"
        />
        <div className="flex min-w-0 flex-col">
          <span className={cn(TYPE.display, "text-ink")}>
            {formatTemperature(current.temperature)}
          </span>
          <span className="text-ink-3 truncate text-body">{condition.label}</span>
        </div>
        <div className="ml-auto flex flex-col items-end gap-0.5 text-body tabular-nums">
          <span className="text-ink">H {formatTemperature(today.max)}</span>
          <span className="text-ink-3">L {formatTemperature(today.min)}</span>
        </div>
      </div>

      {imminent && (
        <div
          className="
            bg-primary text-primary-foreground inline-flex w-fit items-center gap-1.5 rounded-full
            px-2.5 py-1 text-caption font-medium
          "
        >
          <Umbrella className="size-3.5 shrink-0" aria-hidden />
          <span>
            {imminent.inHours <= 1 ? "Rain within the hour" : `Rain in ~${imminent.inHours}h`} ·{" "}
            {imminent.probability}%
          </span>
        </div>
      )}

      {visible.length > 0 && (
        <div className="text-ink-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption">
          {shows("feelsLike") && (
            <span>Feels like {formatTemperature(current.apparentTemperature)}</span>
          )}
          {shows("humidity") && (
            <span className="inline-flex items-center gap-1">
              <Droplets className="size-3.5 shrink-0" aria-hidden />
              {current.humidity}%
            </span>
          )}
          {shows("wind") && (
            <span className="inline-flex items-center gap-1">
              <Wind className="size-3.5 shrink-0" aria-hidden />
              {Math.round(current.windSpeed)} {unitLabels.windSpeed}
              <Navigation
                className="size-3 shrink-0"
                style={{ transform: `rotate(${current.windDirection + 180}deg)` }}
                role="img"
                aria-label={`from the ${windCardinal(current.windDirection)}`}
              />
            </span>
          )}
          {shows("uv") && uvIndex !== null && <span>UV {Math.round(uvIndex)}</span>}
          {shows("sunrise") && (
            <span className="inline-flex items-center gap-1">
              <Sunrise className="size-3.5 shrink-0" aria-hidden />
              {formatClock(sunrise, !clock24h)}
            </span>
          )}
          {shows("sunset") && (
            <span className="inline-flex items-center gap-1">
              <Sunset className="size-3.5 shrink-0" aria-hidden />
              {formatClock(sunset, !clock24h)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
