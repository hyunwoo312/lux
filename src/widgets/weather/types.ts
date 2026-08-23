import type { AccentPreset } from "@/widgets/core/accent";

export const WEATHER_ACCENT: AccentPreset = "cyan";

export type WeatherUnits = "metric" | "imperial";

export const WEATHER_WIND_UNITS = ["auto", "kmh", "ms", "mph", "kn"] as const;
export type WeatherWindUnit = (typeof WEATHER_WIND_UNITS)[number];

export const WEATHER_FORECAST_DAYS = ["3", "5", "7"] as const;
export type WeatherForecastDays = (typeof WEATHER_FORECAST_DAYS)[number];

export const WEATHER_RAIN_ALERTS = ["off", "chance", "likely"] as const;
export type WeatherRainAlert = (typeof WEATHER_RAIN_ALERTS)[number];

export const WEATHER_METRICS = [
  "feelsLike",
  "humidity",
  "wind",
  "uv",
  "sunrise",
  "sunset",
] as const;
export type WeatherMetric = (typeof WEATHER_METRICS)[number];

export type WeatherLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export function makeLocationId(latitude: number, longitude: number): string {
  return `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
}

export type WeatherNow = {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  windGusts: number | null;
  windDirection: number;
  weatherCode: number;
  isDay: boolean;
};

export type WeatherHour = {
  time: string;
  temperature: number;
  weatherCode: number;
  precipitationProbability: number;
  isDay: boolean;
};

export type WeatherDay = {
  date: string;
  weatherCode: number;
  max: number;
  min: number;
  precipitationSum: number | null;
  precipitationChance: number | null;
};

export type WeatherMinute = {
  time: string;
  precipitation: number;
  probability: number;
};

export type WeatherUnitLabels = {
  temperature: string;
  windSpeed: string;
};

export type WeatherData = {
  current: WeatherNow;
  today: WeatherDay;
  sunrise: string;
  sunset: string;
  uvIndex: number | null;
  hourly: WeatherHour[];
  minutely: WeatherMinute[];
  daily: WeatherDay[];
  unitLabels: WeatherUnitLabels;
};

export type GeocodeResult = {
  id: number;
  name: string;
  label: string;
  latitude: number;
  longitude: number;
};
