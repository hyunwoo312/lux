import { cn } from "@/lib/utils";
import { formatTemperature, formatWeekday, shownChance } from "@/widgets/weather/lib/forecast";
import { WeatherIcon } from "@/widgets/weather/components/WeatherIcon";
import type { WeatherDay } from "@/widgets/weather/types";

type Props = {
  days: WeatherDay[];
  currentTime: string;
  selectedDate: string | null;
  onSelect: (date: string) => void;
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

export function WeatherDaily({ days, currentTime, selectedDate, onSelect }: Props) {
  const low = days.length ? Math.min(...days.map((entry) => entry.min)) : 0;
  const high = days.length ? Math.max(...days.map((entry) => entry.max)) : 0;
  return (
    <>
      {days.length > 0 && (
        <ul
          aria-label="Daily forecast"
          className="border-border/50 flex flex-col gap-0.5 border-t pt-2"
        >
          {days.map((entry) => {
            const chance = shownChance(entry.precipitationChance);
            const active = entry.date === selectedDate;
            const label =
              entry.date === currentTime.slice(0, 10)
                ? "Today"
                : `${formatWeekday(entry.date)} ${Number(entry.date.slice(8))}`;
            return (
              <li key={entry.date}>
                <button
                  type="button"
                  aria-label={`${label}, low ${formatTemperature(entry.min)}, high ${formatTemperature(entry.max)}${chance !== null ? `, ${chance}% rain chance` : ""}`}
                  aria-pressed={active}
                  onClick={() => onSelect(entry.date)}
                  className={cn(
                    `
                      focus-ring relative flex w-full cursor-pointer items-center gap-2 rounded-md
                      px-2 py-2 text-left text-caption transition-colors
                      hover:bg-foreground/5
                    `,
                    active && "text-ink bg-primary/8 ring-1 ring-inset ring-primary/30",
                  )}
                >
                  <span
                    className={cn(
                      "w-12 shrink-0 text-micro",
                      active ? "text-ink font-medium" : "text-ink-3",
                    )}
                  >
                    {label}
                  </span>
                  <WeatherIcon
                    code={entry.weatherCode}
                    isDay
                    className={cn("size-4 shrink-0", active ? "text-primary" : "text-ink-3")}
                  />
                  <span className="text-info w-8 shrink-0 text-micro tabular-nums">
                    {chance !== null ? `${chance}%` : ""}
                  </span>
                  <span className="text-ink-3 w-7 shrink-0 text-right tabular-nums">
                    {formatTemperature(entry.min)}
                  </span>
                  <RangeBar day={entry} low={low} high={high} />
                  <span className="text-ink w-7 shrink-0 text-right tabular-nums">
                    {formatTemperature(entry.max)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
