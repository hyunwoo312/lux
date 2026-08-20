import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchWeather,
  parseCachedWeather,
  weatherCacheKey,
} from "@/widgets/weather/lib/open-meteo";
import type { WeatherData, WeatherLocation, WeatherWindUnit } from "@/widgets/weather/types";

const valid: WeatherData = {
  current: {
    time: "2026-06-26T10:00",
    temperature: 20,
    apparentTemperature: 19,
    humidity: 50,
    windSpeed: 5,
    windDirection: 180,
    weatherCode: 1,
    isDay: true,
  },
  today: { date: "2026-06-26", weatherCode: 1, max: 25, min: 15 },
  sunrise: "2026-06-26T05:30",
  sunset: "2026-06-26T20:45",
  uvIndex: 3,
  hourly: [
    {
      time: "2026-06-26T11:00",
      temperature: 21,
      weatherCode: 1,
      precipitationProbability: 10,
      isDay: true,
    },
  ],
  daily: [{ date: "2026-06-26", weatherCode: 1, max: 25, min: 15 }],
  unitLabels: { temperature: "°F", windSpeed: "mph" },
};

describe("parseCachedWeather", () => {
  it("returns the data for a well-formed cached payload", () => {
    expect(parseCachedWeather(valid)).toEqual(valid);
  });

  it("allows a null uv index", () => {
    expect(parseCachedWeather({ ...valid, uvIndex: null })).toEqual({ ...valid, uvIndex: null });
  });

  it("rejects a payload with a wrong field type", () => {
    expect(
      parseCachedWeather({ ...valid, current: { ...valid.current, isDay: "yes" } }),
    ).toBeNull();
  });

  it("rejects a payload missing a required field", () => {
    const incomplete = { ...valid } as Record<string, unknown>;
    delete incomplete.unitLabels;
    expect(parseCachedWeather(incomplete)).toBeNull();
  });

  it("rejects non-object input", () => {
    expect(parseCachedWeather(null)).toBeNull();
    expect(parseCachedWeather("nope")).toBeNull();
  });
});

const LOCATION: WeatherLocation = { id: "a", name: "Anywhere", latitude: 1, longitude: 2 };

const forecastResponse = {
  current: {
    time: "2026-06-26T10:00",
    temperature_2m: 20,
    apparent_temperature: 19,
    relative_humidity_2m: 50,
    weather_code: 1,
    wind_speed_10m: 5,
    wind_direction_10m: 180,
    is_day: 1,
  },
  current_units: { temperature_2m: "°C", wind_speed_10m: "km/h" },
  hourly: {
    time: ["2026-06-26T11:00"],
    temperature_2m: [21],
    weather_code: [1],
    precipitation_probability: [10],
    is_day: [1],
  },
  daily: {
    time: ["2026-06-26"],
    weather_code: [1],
    temperature_2m_max: [25],
    temperature_2m_min: [15],
    sunrise: ["2026-06-26T05:30"],
    sunset: ["2026-06-26T20:45"],
    uv_index_max: [3],
  },
};

async function requestedParams(
  units: "metric" | "imperial",
  windUnit: WeatherWindUnit,
): Promise<URLSearchParams> {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => forecastResponse });
  vi.stubGlobal("fetch", fetchMock);
  await fetchWeather(LOCATION, units, windUnit);
  return new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("wind speed unit", () => {
  it("follows the unit preset when set to auto", async () => {
    expect((await requestedParams("imperial", "auto")).get("wind_speed_unit")).toBe("mph");
    expect((await requestedParams("metric", "auto")).get("wind_speed_unit")).toBe("kmh");
  });

  it("overrides the preset when set explicitly", async () => {
    const params = await requestedParams("metric", "mph");

    expect(params.get("temperature_unit")).toBe("celsius");
    expect(params.get("wind_speed_unit")).toBe("mph");
  });

  it("asks for enough days to fill the longest forecast option", async () => {
    expect((await requestedParams("metric", "auto")).get("forecast_days")).toBe("8");
  });
});

describe("weatherCacheKey", () => {
  it("separates two windows on the same place that differ only by wind unit", () => {
    expect(weatherCacheKey(LOCATION, "metric", "mph")).not.toBe(
      weatherCacheKey(LOCATION, "metric", "ms"),
    );
  });

  it("treats auto as the preset it resolves to, so switching to it reuses the cache", () => {
    expect(weatherCacheKey(LOCATION, "imperial", "auto")).toBe(
      weatherCacheKey(LOCATION, "imperial", "mph"),
    );
  });
});
