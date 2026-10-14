import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Droplets, Thermometer, Wind } from "lucide-react";
import { fade } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { formatHour } from "@/widgets/weather/lib/forecast";
import {
  forecastValue,
  formatForecastValue,
  type ForecastMetric,
  type ForecastUnitLabels,
} from "@/widgets/weather/lib/forecast-metrics";
import { WeatherIcon } from "@/widgets/weather/components/WeatherIcon";
import { wmoInfo } from "@/widgets/weather/lib/wmo";
import type { WeatherHour, WeatherDay, WeatherUnits } from "@/widgets/weather/types";

type Props = {
  selected: WeatherHour | null;
  day: WeatherDay | undefined;
  selectedDate: string | null;
  metric: ForecastMetric;
  clock24h: boolean;
  units: WeatherUnits;
  unitLabels: ForecastUnitLabels;
};

export function WeatherHourReading({
  selected,
  day,
  selectedDate,
  metric,
  clock24h,
  units,
  unitLabels,
}: Props) {
  const reduced = useReducedMotion();
  const isDay =
    selected && day?.sunrise && day?.sunset
      ? selected.time >= day.sunrise && selected.time < day.sunset
      : selected
        ? Number(selected.time.slice(11, 13)) >= 6 && Number(selected.time.slice(11, 13)) < 18
        : true;
  return (
    <div className="min-h-12 px-1 py-1">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${selectedDate}-${metric}`}
          {...fade(reduced, "fast")}
          className="flex flex-col gap-1.5"
        >
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <span className="text-ink-3 flex min-w-0 items-center gap-1.5 text-caption">
                  <WeatherIcon
                    code={selected.weatherCode}
                    isDay={Boolean(isDay)}
                    className="size-4 shrink-0"
                  />
                  <span>
                    {formatHour(selected.time, !clock24h)} ·{" "}
                    {wmoInfo(selected.weatherCode, Boolean(isDay)).label}
                  </span>
                </span>
                <span
                  className="text-ink text-caption font-medium tabular-nums"
                  data-forecast-reading
                >
                  {formatForecastValue(forecastValue(selected, metric), metric, unitLabels)}
                </span>
              </div>
              <div
                className={cn(
                  "text-ink-3 text-micro tabular-nums",
                  "flex flex-wrap items-center gap-x-3 gap-y-1",
                )}
              >
                {metric !== "temperature" && (
                  <span className="flex items-center gap-1">
                    <Thermometer className="size-3" aria-hidden />
                    {formatForecastValue(selected.temperature, "temperature", unitLabels)}
                  </span>
                )}
                {metric === "temperature" && selected.apparentTemperature != null && (
                  <span>
                    Feels{" "}
                    {formatForecastValue(selected.apparentTemperature, "temperature", unitLabels)}
                  </span>
                )}
                {metric !== "rain" && selected.precipitationProbability !== null && (
                  <span className="flex items-center gap-1">
                    <Droplets className="size-3" aria-hidden />
                    {Math.round(selected.precipitationProbability)}% chance
                  </span>
                )}
                {metric === "rain" &&
                  selected.precipitation != null &&
                  unitLabels.precipitation && (
                    <span>
                      {selected.precipitation.toLocaleString(undefined, {
                        maximumFractionDigits: units === "imperial" ? 3 : 1,
                      })}{" "}
                      {unitLabels.precipitation} precipitation
                    </span>
                  )}
                {metric !== "wind" && selected.windSpeed != null && (
                  <span className="flex items-center gap-1">
                    <Wind className="size-3" aria-hidden />
                    {formatForecastValue(selected.windSpeed, "wind", unitLabels)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-ink-3 text-caption">Hourly details unavailable for this day.</p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
