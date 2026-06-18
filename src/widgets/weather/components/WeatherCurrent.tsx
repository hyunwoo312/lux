import { Droplets, Navigation, Sunrise, Sunset, Umbrella, Wind } from "lucide-react";
import {
  findImminentPrecip,
  formatClock,
  formatTemperature,
  windCardinal,
} from "@/widgets/weather/lib/forecast";
import { wmoInfo } from "@/widgets/weather/lib/wmo";
import { WeatherIcon } from "@/widgets/weather/components/WeatherIcon";
import type { WeatherData } from "@/widgets/weather/types";

type WeatherCurrentProps = {
  data: WeatherData;
  name: string;
};

export function WeatherCurrent({ data, name }: WeatherCurrentProps) {
  const { current, today, hourly, sunrise, sunset, uvIndex, unitLabels } = data;
  const condition = wmoInfo(current.weatherCode, current.isDay);
  const imminent = findImminentPrecip(hourly, current.time);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-foreground truncate pr-8 text-sm font-medium">{name}</span>
      <div className="flex items-center gap-3">
        <WeatherIcon
          code={current.weatherCode}
          isDay={current.isDay}
          className="text-foreground size-12"
        />
        <div className="flex min-w-0 flex-col">
          <span className="text-foreground text-4xl leading-none font-semibold tabular-nums">
            {formatTemperature(current.temperature)}
          </span>
          <span className="text-muted-foreground truncate text-sm">{condition.label}</span>
        </div>
        <div className="ml-auto flex flex-col items-end gap-0.5 text-sm tabular-nums">
          <span className="text-foreground">
            H {formatTemperature(today.max)}
          </span>
          <span className="text-muted-foreground">L {formatTemperature(today.min)}</span>
        </div>
      </div>

      {imminent && (
        <div className="
          bg-primary text-primary-foreground inline-flex w-fit items-center gap-1.5 rounded-full
          px-2.5 py-1 text-xs font-medium
        ">
          <Umbrella className="size-3.5 shrink-0" aria-hidden />
          <span>
            {imminent.inHours <= 1 ? "Rain within the hour" : `Rain in ~${imminent.inHours}h`} ·{" "}
            {imminent.probability}%
          </span>
        </div>
      )}

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span>Feels like {formatTemperature(current.apparentTemperature)}</span>
          <span className="inline-flex items-center gap-1">
            <Droplets className="size-3.5 shrink-0" aria-hidden />
            {current.humidity}%
          </span>
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
          {uvIndex !== null && <span>UV {Math.round(uvIndex)}</span>}
          {sunrise && (
            <span className="inline-flex items-center gap-1">
              <Sunrise className="size-3.5 shrink-0" aria-hidden />
              {formatClock(sunrise)}
            </span>
          )}
          {sunset && (
            <span className="inline-flex items-center gap-1">
              <Sunset className="size-3.5 shrink-0" aria-hidden />
              {formatClock(sunset)}
            </span>
          )}
      </div>
    </div>
  );
}
