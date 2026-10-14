import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchWeather,
  parseCachedWeather,
  weatherCacheKey,
  windSpeedLabel,
} from "@/widgets/weather/lib/open-meteo";
import type { WeatherData, WeatherLocation, WeatherWindUnit } from "@/widgets/weather/types";

const valid: WeatherData = {
  current: {
    time: "2026-06-26T10:00",
    temperature: 20,
    apparentTemperature: 19,
    humidity: 50,
    windSpeed: 5,
    windGusts: 9,
    windDirection: 180,
    weatherCode: 1,
    isDay: true,
  },
  today: {
    date: "2026-06-26",
    weatherCode: 1,
    max: 25,
    min: 15,
    precipitationChance: null,
  },
  sunrise: "2026-06-26T05:30",
  sunset: "2026-06-26T20:45",
  uvIndex: 3,
  hourly: [
    {
      time: "2026-06-26T11:00",
      temperature: 21,
      weatherCode: 1,
      precipitationProbability: 10,
    },
  ],
  daily: [
    {
      date: "2026-06-26",
      weatherCode: 1,
      max: 25,
      min: 15,
      precipitationChance: null,
    },
  ],
  minutely: [],
  unitLabels: { windSpeed: "mph" },
};

describe("parseCachedWeather", () => {
  it("returns the data for a well-formed cached payload", () => {
    expect(parseCachedWeather(valid)).toEqual(valid);
  });

  it("allows a null uv index", () => {
    expect(parseCachedWeather({ ...valid, uvIndex: null })).toEqual({ ...valid, uvIndex: null });
  });

  it("preserves optional forecast context and missing probability in a cache round trip", () => {
    const enriched = {
      ...valid,
      hourly: [
        {
          ...valid.hourly[0],
          precipitationProbability: null,
          apparentTemperature: 18,
          humidity: null,
          windSpeed: 7,
          precipitation: 0.03,
        },
      ],
      daily: [{ ...valid.daily[0], sunrise: null, sunset: "2026-06-26T20:45", uvIndex: 4 }],
      unitLabels: { windSpeed: "mph", precipitation: "in" },
    };
    expect(parseCachedWeather(enriched)).toEqual(enriched);
  });

  it("returns null for a cached payload that no longer matches the shape", () => {
    const incomplete = { ...valid } as Record<string, unknown>;
    delete incomplete.unitLabels;

    expect(
      parseCachedWeather({ ...valid, current: { ...valid.current, isDay: "yes" } }),
    ).toBeNull();
    expect(parseCachedWeather(incomplete)).toBeNull();
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
  hourly: {
    time: ["2026-06-26T11:00"],
    temperature_2m: [21],
    weather_code: [1],
    precipitation_probability: [10],
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
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(forecastResponse)));
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

  it("requests hourly context in the same forecast with explicit precipitation units", async () => {
    const params = await requestedParams("imperial", "auto");
    expect(params.get("hourly")?.split(",")).toEqual(
      expect.arrayContaining([
        "apparent_temperature",
        "relative_humidity_2m",
        "wind_speed_10m",
        "precipitation",
      ]),
    );
    expect(params.get("precipitation_unit")).toBe("inch");
    expect(params.get("timezone")).toBe("auto");
  });
});

describe("forecast normalization", () => {
  it("retains optional context, leaves missing metrics unknown and drops incomplete core rows", async () => {
    const response = {
      ...forecastResponse,
      hourly: {
        time: ["2026-06-26T11:00", "2026-06-26T12:00", "2026-06-26T13:00"],
        temperature_2m: [21, null, 23],
        weather_code: [1, 1],
        precipitation_probability: [null],
        apparent_temperature: [20],
        relative_humidity_2m: [50],
        wind_speed_10m: [7],
        precipitation: [0.2],
      },
      daily: {
        ...forecastResponse.daily,
        time: ["2026-06-26", "2026-06-27"],
        weather_code: [1, 2],
        temperature_2m_max: [25, 28],
        temperature_2m_min: [15, null],
      },
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)));
    vi.stubGlobal("fetch", fetchMock);
    const data = await fetchWeather(LOCATION, "metric", "auto");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(data.hourly).toEqual([
      {
        time: "2026-06-26T11:00",
        temperature: 21,
        weatherCode: 1,
        precipitationProbability: null,
        apparentTemperature: 20,
        humidity: 50,
        windSpeed: 7,
        precipitation: 0.2,
      },
    ]);
    expect(data.daily).toHaveLength(1);
    expect(data.today).toMatchObject({ sunrise: "2026-06-26T05:30", uvIndex: 3 });
    expect(data.unitLabels.precipitation).toBe("mm");
  });

  it("rejects a response without a usable current-date forecast instead of calling tomorrow today", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...forecastResponse,
            daily: { ...forecastResponse.daily, time: ["2026-06-27"] },
          }),
        ),
      ),
    );
    await expect(fetchWeather(LOCATION, "metric", "auto")).rejects.toThrow("missing forecast");
  });

  it("does not turn an absent hourly probability or detail array into zero", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...forecastResponse,
            hourly: { time: ["2026-06-26T11:00"], temperature_2m: [21], weather_code: [1] },
          }),
        ),
      ),
    );
    const data = await fetchWeather(LOCATION, "metric", "auto");
    expect(data.hourly[0]).toMatchObject({
      precipitationProbability: null,
      apparentTemperature: null,
      humidity: null,
      windSpeed: null,
      precipitation: null,
    });
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

describe("windSpeedLabel", () => {
  it("writes miles per hour the way people write it, not the way the API sends it", () => {
    expect(windSpeedLabel("imperial", "auto")).toBe("mph");
  });

  it("spells the metric units out rather than echoing the request value", () => {
    expect(windSpeedLabel("metric", "auto")).toBe("km/h");
    expect(windSpeedLabel("metric", "ms")).toBe("m/s");
  });
});
