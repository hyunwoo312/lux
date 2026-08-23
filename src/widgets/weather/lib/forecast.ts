import { isPrecipitationCode } from "@/widgets/weather/lib/wmo";
import type { WeatherHour } from "@/widgets/weather/types";

export type ImminentPrecip = {
  inHours: number;
  probability: number;
};

type ImminentOptions = {
  withinHours?: number;
  threshold?: number;
};

export function findImminentPrecip(
  hourly: WeatherHour[],
  fromIso: string,
  options: ImminentOptions = {},
): ImminentPrecip | null {
  const { withinHours = 6, threshold = 50 } = options;
  const start = hourly.findIndex((hour) => hour.time > fromIso);
  if (start === -1) return null;
  const end = Math.min(start + withinHours, hourly.length);
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
  if (!date) return "";
  return format(date, { hour: hour12 ? "numeric" : "2-digit", minute: "2-digit", hour12 });
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export function windCardinal(degrees: number): string {
  return COMPASS[Math.round(degrees / 45) % 8] ?? "N";
}
