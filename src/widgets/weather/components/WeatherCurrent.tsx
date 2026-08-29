import {
  Droplets,
  Navigation,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Umbrella,
  Wind,
} from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TYPE } from "@/lib/type";
import {
  findImminentPrecip,
  formatIsoClock,
  formatTemperature,
  windCardinal,
} from "@/widgets/weather/lib/forecast";
import { findNowcast, nowcastLabel } from "@/widgets/weather/lib/nowcast";
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

function Reading({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip content={label} side="top">
      <span className="text-ink-3 inline-flex items-center gap-1 text-caption tabular-nums slashed-zero">
        <span className="sr-only">{label}</span>
        {children}
      </span>
    </Tooltip>
  );
}

export function WeatherCurrent({ data, name }: WeatherCurrentProps) {
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const metrics = useWeather((d) => d.metrics);
  const rainAlert = useWeather((d) => d.rainAlert);
  const { current, today, hourly, minutely, sunrise, sunset, uvIndex, unitLabels } = data;
  const condition = wmoInfo(current.weatherCode, current.isDay);
  const threshold = rainAlert === "off" ? null : RAIN_THRESHOLD[rainAlert];

  const nowcast = threshold === null ? null : findNowcast(minutely, current.time, threshold);
  const imminent =
    threshold === null || nowcast ? null : findImminentPrecip(hourly, current.time, threshold);
  const alert = nowcast
    ? { text: nowcastLabel(nowcast), probability: nowcast.probability }
    : imminent
      ? {
          text: imminent.inHours <= 1 ? "Rain within the hour" : `Rain in ~${imminent.inHours}h`,
          probability: imminent.probability,
        }
      : null;

  const hasValue = (metric: WeatherMetric) => {
    if (metric === "uv") return uvIndex !== null;
    if (metric === "sunrise") return Boolean(sunrise);
    if (metric === "sunset") return Boolean(sunset);
    return true;
  };
  const visible = metrics.filter(hasValue);
  const shows = (metric: WeatherMetric) => visible.includes(metric);
  const uv = shows("uv") ? uvIndex : null;

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
          <span className={cn(TYPE.rowMeta, "truncate")}>{condition.label}</span>
        </div>
        <div className="ml-auto flex flex-col items-end gap-0.5 text-body tabular-nums slashed-zero">
          <span className="text-ink">H {formatTemperature(today.max)}</span>
          <span className="text-ink-3">L {formatTemperature(today.min)}</span>
        </div>
      </div>

      {alert && (
        <div
          className="
            bg-warning text-warning-foreground inline-flex w-fit items-center gap-1.5 rounded-full
            px-2.5 py-1 text-caption font-medium tabular-nums slashed-zero
          "
        >
          <Umbrella className="size-3.5 shrink-0" aria-hidden />
          <span>
            {alert.text} · {alert.probability}%
          </span>
        </div>
      )}

      {visible.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {shows("feelsLike") && (
            <Reading label="Feels like">
              <Thermometer className="size-3.5 shrink-0" aria-hidden />
              {formatTemperature(current.apparentTemperature)}
            </Reading>
          )}
          {shows("humidity") && (
            <Reading label="Humidity">
              <Droplets className="size-3.5 shrink-0" aria-hidden />
              {current.humidity}%
            </Reading>
          )}
          {shows("wind") && (
            <Reading
              label={
                current.windGusts != null
                  ? `Wind, gusting ${Math.round(current.windGusts)} ${unitLabels.windSpeed}`
                  : "Wind"
              }
            >
              <Wind className="size-3.5 shrink-0" aria-hidden />
              {Math.round(current.windSpeed)} {unitLabels.windSpeed}
              <Navigation
                className="size-3 shrink-0"
                style={{ transform: `rotate(${current.windDirection + 180}deg)` }}
                role="img"
                aria-label={`from the ${windCardinal(current.windDirection)}`}
              />
            </Reading>
          )}
          {uv !== null && (
            <Reading label="UV index">
              <Sun className="size-3.5 shrink-0" aria-hidden />
              {Math.round(uv)}
            </Reading>
          )}
          {shows("sunrise") && (
            <Reading label="Sunrise">
              <Sunrise className="size-3.5 shrink-0" aria-hidden />
              {formatIsoClock(sunrise, !clock24h)}
            </Reading>
          )}
          {shows("sunset") && (
            <Reading label="Sunset">
              <Sunset className="size-3.5 shrink-0" aria-hidden />
              {formatIsoClock(sunset, !clock24h)}
            </Reading>
          )}
        </div>
      )}
    </div>
  );
}
