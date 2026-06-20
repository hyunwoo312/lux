import type { AccentPreset } from "@/widgets/core/accent";

export const WEATHER_ACCENT: AccentPreset = "cyan";

export type WeatherUnits = "metric" | "imperial";

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
