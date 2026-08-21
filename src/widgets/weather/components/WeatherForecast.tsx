import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { formatHour, formatTemperature, formatWeekday } from "@/widgets/weather/lib/forecast";
import { WeatherIcon } from "@/widgets/weather/components/WeatherIcon";
import { useWeather } from "@/widgets/weather/useWeatherStore";
import type { WeatherData } from "@/widgets/weather/types";

const HOURLY_COUNT = 48;
const HOURLY_PRECIP_MIN = 20;

type WeatherForecastProps = {
  data: WeatherData;
  showHourly: boolean;
  showDaily: boolean;
};

export function WeatherForecast({ data, showHourly, showDaily }: WeatherForecastProps) {
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const forecastDays = useWeather((d) => d.forecastDays);
  const { current, hourly, daily } = data;
  const start = hourly.findIndex((hour) => hour.time > current.time);
  const hours = start === -1 ? [] : hourly.slice(start, start + HOURLY_COUNT);
  const days = daily.slice(1, 1 + Number(forecastDays));

  return (
    <div className="flex flex-col gap-2">
      {showHourly && hours.length > 0 && (
        <div className="border-border/50 flex gap-1 overflow-x-auto border-t pt-2">
          {hours.map((hour) => (
            <div key={hour.time} className="flex w-10 shrink-0 flex-col items-center gap-1">
              <span className="text-ink-3 text-micro">{formatHour(hour.time, !clock24h)}</span>
              <WeatherIcon code={hour.weatherCode} isDay={hour.isDay} className="text-ink size-4" />
              <span className="text-ink text-caption tabular-nums">
                {formatTemperature(hour.temperature)}
              </span>
              <span className="text-ink-3 text-micro tabular-nums">
                {hour.precipitationProbability >= HOURLY_PRECIP_MIN
                  ? `${hour.precipitationProbability}%`
                  : " "}
              </span>
            </div>
          ))}
        </div>
      )}

      {showDaily && days.length > 0 && (
        <div className="border-border/50 flex flex-col gap-1 border-t pt-2">
          {days.map((day) => (
            <div key={day.date} className="flex items-center gap-3 text-body">
              <span className="text-ink-3 w-9 shrink-0">{formatWeekday(day.date)}</span>
              <WeatherIcon code={day.weatherCode} isDay className="text-ink-3 size-4" />
              <span className="text-ink ml-auto tabular-nums">{formatTemperature(day.max)}</span>
              <span className="text-ink-3 w-8 text-right tabular-nums">
                {formatTemperature(day.min)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
