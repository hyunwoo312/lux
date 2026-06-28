import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { formatHour, formatTemperature, formatWeekday } from "@/widgets/weather/lib/forecast";
import { WeatherIcon } from "@/widgets/weather/components/WeatherIcon";
import type { WeatherData } from "@/widgets/weather/types";

const HOURLY_COUNT = 6;
const DAILY_COUNT = 5;
const HOURLY_PRECIP_MIN = 20;

type WeatherForecastProps = {
  data: WeatherData;
  showHourly: boolean;
  showDaily: boolean;
};

export function WeatherForecast({ data, showHourly, showDaily }: WeatherForecastProps) {
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const { current, hourly, daily } = data;
  const start = hourly.findIndex((hour) => hour.time > current.time);
  const hours = start === -1 ? [] : hourly.slice(start, start + HOURLY_COUNT);
  const days = daily.slice(1, 1 + DAILY_COUNT);

  return (
    <div className="flex flex-col gap-2">
      {showHourly && hours.length > 0 && (
        <div className="border-border/50 grid grid-cols-6 gap-1 border-t pt-2">
          {hours.map((hour) => (
            <div key={hour.time} className="flex flex-col items-center gap-1">
              <span className="text-muted-foreground text-2xs">
                {formatHour(hour.time, !clock24h)}
              </span>
              <WeatherIcon
                code={hour.weatherCode}
                isDay={hour.isDay}
                className="text-foreground size-4"
              />
              <span className="text-foreground text-xs tabular-nums">
                {formatTemperature(hour.temperature)}
              </span>
              <span className="text-muted-foreground text-2xs tabular-nums">
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
            <div key={day.date} className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-9 shrink-0">{formatWeekday(day.date)}</span>
              <WeatherIcon
                code={day.weatherCode}
                isDay
                className="text-muted-foreground size-4"
              />
              <span className="text-foreground ml-auto tabular-nums">
                {formatTemperature(day.max)}
              </span>
              <span className="text-muted-foreground w-8 text-right tabular-nums">
                {formatTemperature(day.min)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
