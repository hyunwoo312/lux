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
const HOURLY_H = 76;
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatTemperature(value: number): string {
  return `${Math.round(value)}°`;
}

export function formatHour(iso: string, hour12: boolean): string {
  const hour = Number(iso.slice(11, 13));
  if (Number.isNaN(hour)) return "";
  if (!hour12) return String(hour).padStart(2, "0");
  const period = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${period}`;
}

export function formatWeekday(date: string): string {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return WEEKDAYS[day] ?? "";
}

export function formatClock(iso: string, hour12: boolean): string {
  const hour = Number(iso.slice(11, 13));
  const minute = iso.slice(14, 16);
  if (Number.isNaN(hour) || minute.length !== 2) return "";
  if (!hour12) return `${String(hour).padStart(2, "0")}:${minute}`;
  const period = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minute} ${period}`;
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export function windCardinal(degrees: number): string {
  return COMPASS[Math.round(degrees / 45) % 8] ?? "N";
}
