import type { WeatherData, WeatherHour } from "@/widgets/weather/types";
import { formatTemperature } from "@/widgets/weather/lib/forecast";

export const FORECAST_METRICS = ["temperature", "rain", "wind", "humidity"] as const;
export type ForecastMetric = (typeof FORECAST_METRICS)[number];
export type ForecastUnitLabels = WeatherData["unitLabels"] & { temperature?: string };
export const FORECAST_LABELS: Record<ForecastMetric, string> = {
  temperature: "Temperature",
  rain: "Rain chance",
  wind: "Wind",
  humidity: "Humidity",
};

export function forecastValue(hour: WeatherHour, metric: ForecastMetric): number | null {
  switch (metric) {
    case "temperature":
      return hour.temperature;
    case "rain":
      return hour.precipitationProbability;
    case "wind":
      return hour.windSpeed ?? null;
    case "humidity":
      return hour.humidity ?? null;
  }
}

export function formatForecastValue(
  value: number | null,
  metric: ForecastMetric,
  units: ForecastUnitLabels,
): string {
  if (value === null) return "Unavailable";
  if (metric === "temperature")
    return units.temperature
      ? `${Math.round(value)}${units.temperature}`
      : formatTemperature(value);
  if (metric === "rain" || metric === "humidity") return `${Math.round(value)}%`;
  return `${Math.round(value)} ${units.windSpeed}`;
}
