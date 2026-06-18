import { z } from "zod";
import type {
  GeocodeResult,
  WeatherData,
  WeatherDay,
  WeatherLocation,
  WeatherUnits,
} from "@/widgets/weather/types";

const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
const REQUEST_TIMEOUT_MS = 10_000;

function withTimeout(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

const forecastSchema = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    relative_humidity_2m: z.number(),
    weather_code: z.number(),
    wind_speed_10m: z.number(),
    wind_direction_10m: z.number(),
    is_day: z.number(),
  }),
  current_units: z.object({
    temperature_2m: z.string(),
    wind_speed_10m: z.string(),
  }),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: z.array(z.number()),
    weather_code: z.array(z.number()),
    precipitation_probability: z.array(z.number().nullable()),
    is_day: z.array(z.number()),
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(z.number()),
    temperature_2m_max: z.array(z.number()),
    temperature_2m_min: z.array(z.number()),
    sunrise: z.array(z.string()),
    sunset: z.array(z.string()),
    uv_index_max: z.array(z.number().nullable()),
  }),
});

function buildDays(daily: z.infer<typeof forecastSchema>["daily"]): WeatherDay[] {
  return daily.time.map((date, index) => ({
    date,
    weatherCode: daily.weather_code[index] ?? 0,
    max: daily.temperature_2m_max[index] ?? 0,
    min: daily.temperature_2m_min[index] ?? 0,
  }));
}

export async function fetchWeather(
  location: WeatherLocation,
  units: WeatherUnits,
  signal?: AbortSignal,
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day",
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max",
    temperature_unit: units === "imperial" ? "fahrenheit" : "celsius",
    wind_speed_unit: units === "imperial" ? "mph" : "kmh",
    timezone: "auto",
    forecast_days: "7",
  });

  const response = await fetch(`${FORECAST_ENDPOINT}?${params.toString()}`, {
    signal: withTimeout(signal),
  });
  if (!response.ok) {
    throw new Error("Weather request failed");
  }
  const parsed = forecastSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Unexpected weather response");
  }

  const { current, current_units, hourly, daily } = parsed.data;
  const days = buildDays(daily);
  const today = days[0];
  if (!today) {
    throw new Error("Weather response missing forecast");
  }

  return {
    current: {
      time: current.time,
      temperature: current.temperature_2m,
      apparentTemperature: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      weatherCode: current.weather_code,
      isDay: current.is_day === 1,
    },
    today,
    sunrise: daily.sunrise[0] ?? "",
    sunset: daily.sunset[0] ?? "",
    uvIndex: daily.uv_index_max[0] ?? null,
    hourly: hourly.time.map((time, index) => ({
      time,
      temperature: hourly.temperature_2m[index] ?? 0,
      weatherCode: hourly.weather_code[index] ?? 0,
      precipitationProbability: hourly.precipitation_probability[index] ?? 0,
      isDay: hourly.is_day[index] === 1,
    })),
    daily: days,
    unitLabels: {
      temperature: current_units.temperature_2m,
      windSpeed: current_units.wind_speed_10m,
    },
  };
}

const geocodeSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        admin1: z.string().optional(),
        country: z.string().optional(),
      }),
    )
    .optional(),
});

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const params = new URLSearchParams({
    name: trimmed,
    count: "5",
    language: "en",
    format: "json",
  });
  const response = await fetch(`${GEOCODE_ENDPOINT}?${params.toString()}`, {
    signal: withTimeout(signal),
  });
  if (!response.ok) {
    throw new Error("Place search failed");
  }
  const parsed = geocodeSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Unexpected place search response");
  }
  return (parsed.data.results ?? []).map((result) => ({
    id: result.id,
    name: result.name,
    label: [result.name, result.admin1, result.country].filter(Boolean).join(", "),
    latitude: result.latitude,
    longitude: result.longitude,
  }));
}

const weatherNowSchema = z.object({
  time: z.string(),
  temperature: z.number(),
  apparentTemperature: z.number(),
  humidity: z.number(),
  windSpeed: z.number(),
  windDirection: z.number(),
  weatherCode: z.number(),
  isDay: z.boolean(),
});

const weatherDaySchema = z.object({
  date: z.string(),
  weatherCode: z.number(),
  max: z.number(),
  min: z.number(),
});

const weatherHourSchema = z.object({
  time: z.string(),
  temperature: z.number(),
  weatherCode: z.number(),
  precipitationProbability: z.number(),
  isDay: z.boolean(),
});

const weatherDataSchema = z.object({
  current: weatherNowSchema,
  today: weatherDaySchema,
  sunrise: z.string(),
  sunset: z.string(),
  uvIndex: z.number().nullable(),
  hourly: z.array(weatherHourSchema),
  daily: z.array(weatherDaySchema),
  unitLabels: z.object({ temperature: z.string(), windSpeed: z.string() }),
});

export function parseCachedWeather(raw: unknown): WeatherData | null {
  const result = weatherDataSchema.safeParse(raw);
  return result.success ? result.data : null;
}
