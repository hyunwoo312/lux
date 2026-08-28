import { formatClock as clockLabel } from "@/lib/clock";
import { isPrecipitationCode } from "@/widgets/weather/lib/wmo";
import type { WeatherHour } from "@/widgets/weather/types";

export type ImminentPrecip = {
  inHours: number;
  probability: number;
};

const WITHIN_HOURS = 6;

export function findImminentPrecip(
  hourly: WeatherHour[],
  fromIso: string,
  threshold: number,
): ImminentPrecip | null {
  const start = hourly.findIndex((hour) => hour.time > fromIso);
  if (start === -1) return null;
  const end = Math.min(start + WITHIN_HOURS, hourly.length);
  for (let index = start; index < end; index += 1) {
    const hour = hourly[index];
    if (!hour) continue;
    if (hour.precipitationProbability >= threshold && isPrecipitationCode(hour.weatherCode)) {
      return { inHours: index - start + 1, probability: hour.precipitationProbability };
    }
  }
  return null;
}

const SECTION_GAP = 8;
const HOURLY_H = 88;
const DAILY_MIN_H = 72;

export function forecastVisibility(
  totalHeight: number,
  currentHeight: number,
): { showHourly: boolean; showDaily: boolean } {
  if (currentHeight <= 0) return { showHourly: false, showDaily: false };
  const room = totalHeight - currentHeight;
  return {
    showHourly: room >= SECTION_GAP + HOURLY_H,
    showDaily: room >= SECTION_GAP + HOURLY_H + SECTION_GAP + DAILY_MIN_H,
  };
}

const TICK_EVERY = 6;
const MIN_TICK_GAP = 38;

export type HourlyTick = { key: string; x: number; midnight: boolean; label: string };

export function hourlyTicks(
  hours: WeatherHour[],
  xFor: (index: number) => number,
  clock24h: boolean,
): { ticks: HourlyTick[]; midnights: HourlyTick[] } {
  const candidates = hours.flatMap((hour, index) => {
    const midnight = index > 0 && hour.time.slice(11, 13) === "00";
    const rank = index === 0 ? 0 : midnight ? 1 : 2;
    if (rank === 2 && index % TICK_EVERY !== 0) return [];
    return [
      {
        key: hour.time,
        rank,
        x: xFor(index),
        midnight,
        label:
          index === 0
            ? "Now"
            : midnight
              ? formatWeekday(hour.time.slice(0, 10))
              : formatHour(hour.time, !clock24h),
      },
    ];
  });

  const ticks = candidates
    .slice()
    .sort((a, b) => a.rank - b.rank || a.x - b.x)
    .reduce<typeof candidates>((kept, tick) => {
      if (kept.some((other) => Math.abs(other.x - tick.x) < MIN_TICK_GAP)) return kept;
      kept.push(tick);
      return kept;
    }, [])
    .sort((a, b) => a.x - b.x);

  return { ticks, midnights: candidates.filter((tick) => tick.midnight) };
}

export const PRECIP_MIN_CHANCE = 20;

export function shownChance(chance: number | null): number | null {
  return chance !== null && chance >= PRECIP_MIN_CHANCE ? chance : null;
}

export function formatTemperature(value: number): string {
  return `${Math.round(value)}°`;
}

function localDate(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function format(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

export function formatHour(iso: string, hour12: boolean): string {
  const date = localDate(iso);
  if (!date) return "";
  return format(date, hour12 ? { hour: "numeric", hour12 } : { hour: "2-digit", hour12 });
}

export function formatWeekday(date: string): string {
  const parsed = localDate(`${date}T12:00:00`);
  return parsed ? format(parsed, { weekday: "short" }) : "";
}

export function formatClock(iso: string, hour12: boolean): string {
  const date = localDate(iso);
  return date ? clockLabel(date, hour12) : "";
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export function windCardinal(degrees: number): string {
  return COMPASS[Math.round(degrees / 45) % 8] ?? "N";
}
