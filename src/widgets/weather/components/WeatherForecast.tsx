import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";
import { formatTemperature, formatWeekday, shownChance } from "@/widgets/weather/lib/forecast";
import { WeatherHourly } from "@/widgets/weather/components/WeatherHourly";
import { WeatherIcon } from "@/widgets/weather/components/WeatherIcon";
import { useWeather } from "@/widgets/weather/useWeatherStore";
import type { WeatherData, WeatherDay } from "@/widgets/weather/types";

const HOURLY_COUNT = 24;

type WeatherForecastProps = {
  data: WeatherData;
  showHourly: boolean;
  showDaily: boolean;
};

function RangeBar({ day, low, high }: { day: WeatherDay; low: number; high: number }) {
  const span = high - low;
  const from = span > 0 ? ((day.min - low) / span) * 100 : 0;
  const to = span > 0 ? ((day.max - low) / span) * 100 : 100;

  return (
    <span className="bg-foreground/10 relative h-1 min-w-6 flex-1 rounded-full">
      <span
        className="bg-ink-3 absolute inset-y-0 rounded-full"
        style={{ left: `${from}%`, right: `${100 - to}%` }}
      />
    </span>
  );
}

export function WeatherForecast({ data, showHourly, showDaily }: WeatherForecastProps) {
  const forecastDays = useWeather((d) => d.forecastDays);
  const { current, hourly, daily } = data;
  const next = hourly.findIndex((hour) => hour.time > current.time);
  const from = Math.max(0, next - 1);
  const hours = next === -1 ? [] : hourly.slice(from, from + HOURLY_COUNT);
  const days = daily.slice(1, 1 + Number(forecastDays));

  const low = days.length > 0 ? Math.min(...days.map((day) => day.min)) : 0;
  const high = days.length > 0 ? Math.max(...days.map((day) => day.max)) : 0;
  const showChance = days.some((day) => shownChance(day.precipitationChance) !== null);

  return (
    <div className="flex flex-col gap-2">
      {showHourly && hours.length > 1 && (
        <div className="border-border/50 border-t pt-2">
          <WeatherHourly hours={hours} className="h-20 w-full" />
        </div>
      )}

      {showDaily && days.length > 0 && (
        <ul className="border-border/50 flex flex-col gap-1.5 border-t pt-2">
          {days.map((day) => {
            const chance = shownChance(day.precipitationChance);
            return (
              <li key={day.date} className="flex items-center gap-2 text-caption">
                <span className={cn(TYPE.rowMeta, "w-9 shrink-0")}>{formatWeekday(day.date)}</span>
                <WeatherIcon code={day.weatherCode} isDay className="text-ink-3 size-4" />
                {showChance && (
                  <span className="text-info w-8 shrink-0 text-micro tabular-nums slashed-zero">
                    {chance !== null ? `${chance}%` : ""}
                  </span>
                )}
                <span className="text-ink-3 w-7 shrink-0 text-right tabular-nums slashed-zero">
                  {formatTemperature(day.min)}
                </span>
                <RangeBar day={day} low={low} high={high} />
                <span className="text-ink w-7 shrink-0 text-right tabular-nums slashed-zero">
                  {formatTemperature(day.max)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
