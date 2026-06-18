import { describe, expect, it } from "vitest";
import { parseCachedWeather } from "@/widgets/weather/lib/open-meteo";
import type { WeatherData } from "@/widgets/weather/types";

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
    { time: "2026-06-26T11:00", temperature: 21, weatherCode: 1, precipitationProbability: 10, isDay: true },
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
    expect(parseCachedWeather({ ...valid, current: { ...valid.current, isDay: "yes" } })).toBeNull();
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
