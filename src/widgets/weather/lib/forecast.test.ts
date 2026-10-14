import { describe, expect, it } from "vitest";
import {
  findImminentPrecip,
  hourlyTicks,
  formatIsoClock,
  formatHour,
  formatTemperature,
  formatWeekday,
  windCardinal,
  hoursForDate,
  resolveForecastDate,
  resolveForecastHour,
} from "@/widgets/weather/lib/forecast";
import type { WeatherHour } from "@/widgets/weather/types";

function hour(
  time: string,
  weatherCode: number,
  precipitationProbability: number | null,
): WeatherHour {
  return { time, weatherCode, precipitationProbability, temperature: 10 };
}

describe("findImminentPrecip", () => {
  const now = "2026-06-25T14:30";

  it("returns the first upcoming hour that is likely to rain", () => {
    const hourly = [
      hour("2026-06-25T14:00", 1, 0),
      hour("2026-06-25T15:00", 1, 10),
      hour("2026-06-25T16:00", 61, 70),
    ];
    expect(findImminentPrecip(hourly, now, 50)).toEqual({ inHours: 2, probability: 70 });
  });

  it("ignores hours at or before now", () => {
    const hourly = [hour("2026-06-25T14:00", 61, 90), hour("2026-06-25T15:00", 1, 0)];
    expect(findImminentPrecip(hourly, now, 50)).toBeNull();
  });

  it("ignores probability spikes without a precipitation code", () => {
    const hourly = [hour("2026-06-25T15:00", 3, 90)];
    expect(findImminentPrecip(hourly, now, 50)).toBeNull();
  });

  it("respects the probability threshold", () => {
    const hourly = [hour("2026-06-25T15:00", 61, 40)];
    expect(findImminentPrecip(hourly, now, 50)).toBeNull();
    expect(findImminentPrecip(hourly, now, 30)).toEqual({ inHours: 1, probability: 40 });
  });

  it("does not look beyond the six-hour window", () => {
    const hourly = [
      hour("2026-06-25T15:00", 1, 0),
      hour("2026-06-25T16:00", 1, 0),
      hour("2026-06-25T17:00", 1, 0),
      hour("2026-06-25T18:00", 1, 0),
      hour("2026-06-25T19:00", 1, 0),
      hour("2026-06-25T20:00", 1, 0),
      hour("2026-06-25T21:00", 61, 80),
    ];
    expect(findImminentPrecip(hourly, now, 50)).toBeNull();
  });
});

describe("hourlyTicks", () => {
  it("keeps Now and midnight over a regular tick when they are closer than the minimum gap", () => {
    const times = [
      "2026-06-25T17:00",
      "2026-06-25T18:00",
      "2026-06-25T19:00",
      "2026-06-25T20:00",
      "2026-06-25T21:00",
      "2026-06-25T22:00",
      "2026-06-25T23:00",
      "2026-06-26T00:00",
    ];
    const { ticks } = hourlyTicks(
      times.map((time) => hour(time, 1, 0)),
      (index) => index * 10,
      false,
      "2026-06-25T17:30",
    );

    expect(ticks.map((tick) => tick.label)).toEqual(["Now", "Fri"]);
  });

  it("shows a future day's first hour as a clock time instead of Now", () => {
    const hours = [hour("2026-06-26T00:00", 1, null)];
    expect(hourlyTicks(hours, () => 0, true, "2026-06-25T17:30").ticks[0]?.label).toBe("00");
    expect(findImminentPrecip(hours, "2026-06-25T23:30", 0)).toBeNull();
  });
});

describe("forecast selection", () => {
  const hours = [hour("2026-06-25T23:00", 1, 0), hour("2026-06-26T00:00", 1, 0)];
  const daily = ["2026-06-25", "2026-06-26"].map((date) => ({
    date,
    weatherCode: 1,
    min: 10,
    max: 20,
    precipitationChance: null,
  }));

  it("groups location wall-clock hours by their provided date", () => {
    expect(hoursForDate(hours, "2026-06-26")).toEqual([hours[1]]);
    expect(hoursForDate(hours, "2026-06-27")).toEqual([]);
  });

  it("retains available selections when a refreshed snapshot has new objects", () => {
    const refreshed = hours.map((entry) => ({ ...entry, temperature: 15 }));
    expect(resolveForecastDate(daily, "2026-06-26", "2026-06-25T23:30")).toBe("2026-06-26");
    expect(resolveForecastHour(refreshed, "2026-06-26T00:00", "2026-06-25T23:30")).toBe(
      refreshed[1],
    );
  });

  it("falls back to the current date/hour, then the next available hour or first row", () => {
    expect(resolveForecastDate(daily, "2026-06-24", "2026-06-26T00:15")).toBe("2026-06-26");
    expect(resolveForecastHour(hours, null, "2026-06-25T23:30")).toBe(hours[0]);
    expect(resolveForecastHour([hours[1]!], null, "2026-06-25T23:30")).toBe(hours[1]);
    expect(resolveForecastHour(hours, null, "2026-06-27T00:00")).toBe(hours[0]);
    expect(resolveForecastDate([], null, "2026-06-25T23:30")).toBeNull();
    expect(resolveForecastHour([], null, "2026-06-25T23:30")).toBeNull();
  });
});

describe("formatters", () => {
  it("rounds temperatures and appends a degree sign", () => {
    expect(formatTemperature(12.4)).toBe("12°");
    expect(formatTemperature(-0.4)).toBe("0°");
  });

  it("formats hours in 12-hour time", () => {
    expect(formatHour("2026-06-25T00:00", true)).toBe("12 AM");
    expect(formatHour("2026-06-25T13:00", true)).toBe("1 PM");
    expect(formatHour("2026-06-25T12:00", true)).toBe("12 PM");
  });

  it("formats hours in 24-hour time", () => {
    expect(formatHour("2026-06-25T00:00", false)).toBe("00");
    expect(formatHour("2026-06-25T13:00", false)).toBe("13");
    expect(formatHour("2026-06-25T09:00", false)).toBe("09");
  });

  it("formats weekdays independent of the runner timezone", () => {
    expect(formatWeekday("2026-06-25")).toBe("Thu");
    expect(formatWeekday("2026-06-28")).toBe("Sun");
  });

  it("formats clock times with minutes in 12-hour time", () => {
    expect(formatIsoClock("2026-06-25T06:04", true)).toBe("6:04 AM");
    expect(formatIsoClock("2026-06-25T00:30", true)).toBe("12:30 AM");
    expect(formatIsoClock("2026-06-25T20:09", true)).toBe("8:09 PM");
  });

  it("formats clock times with minutes in 24-hour time", () => {
    expect(formatIsoClock("2026-06-25T06:04", false)).toBe("06:04");
    expect(formatIsoClock("2026-06-25T00:30", false)).toBe("00:30");
    expect(formatIsoClock("2026-06-25T20:09", false)).toBe("20:09");
  });

  it("maps wind bearings to the nearest compass point", () => {
    expect(windCardinal(0)).toBe("N");
    expect(windCardinal(90)).toBe("E");
    expect(windCardinal(225)).toBe("SW");
    expect(windCardinal(360)).toBe("N");
  });
});
