import { describe, expect, it } from "vitest";
import {
  findImminentPrecip,
  forecastVisibility,
  formatClock,
  formatHour,
  formatTemperature,
  formatWeekday,
  windCardinal,
} from "@/widgets/weather/lib/forecast";
import type { WeatherHour } from "@/widgets/weather/types";

function hour(time: string, weatherCode: number, precipitationProbability: number): WeatherHour {
  return { time, weatherCode, precipitationProbability, temperature: 10, isDay: true };
}

describe("findImminentPrecip", () => {
  const now = "2026-06-25T14:30";

  it("returns the first upcoming hour that is likely to rain", () => {
    const hourly = [
      hour("2026-06-25T14:00", 1, 0),
      hour("2026-06-25T15:00", 1, 10),
      hour("2026-06-25T16:00", 61, 70),
    ];
    expect(findImminentPrecip(hourly, now)).toEqual({ inHours: 2, probability: 70 });
  });

  it("ignores hours at or before now", () => {
    const hourly = [hour("2026-06-25T14:00", 61, 90), hour("2026-06-25T15:00", 1, 0)];
    expect(findImminentPrecip(hourly, now)).toBeNull();
  });

  it("ignores probability spikes without a precipitation code", () => {
    const hourly = [hour("2026-06-25T15:00", 3, 90)];
    expect(findImminentPrecip(hourly, now)).toBeNull();
  });

  it("respects the probability threshold", () => {
    const hourly = [hour("2026-06-25T15:00", 61, 40)];
    expect(findImminentPrecip(hourly, now)).toBeNull();
    expect(findImminentPrecip(hourly, now, { threshold: 30 })).toEqual({
      inHours: 1,
      probability: 40,
    });
  });

  it("does not look beyond the window", () => {
    const hourly = [
      hour("2026-06-25T15:00", 1, 0),
      hour("2026-06-25T16:00", 1, 0),
      hour("2026-06-25T17:00", 61, 80),
    ];
    expect(findImminentPrecip(hourly, now, { withinHours: 2 })).toBeNull();
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
    expect(formatClock("2026-06-25T06:04", true)).toBe("6:04 AM");
    expect(formatClock("2026-06-25T00:30", true)).toBe("12:30 AM");
    expect(formatClock("2026-06-25T20:09", true)).toBe("8:09 PM");
  });

  it("formats clock times with minutes in 24-hour time", () => {
    expect(formatClock("2026-06-25T06:04", false)).toBe("06:04");
    expect(formatClock("2026-06-25T00:30", false)).toBe("00:30");
    expect(formatClock("2026-06-25T20:09", false)).toBe("20:09");
  });

  it("maps wind bearings to the nearest compass point", () => {
    expect(windCardinal(0)).toBe("N");
    expect(windCardinal(90)).toBe("E");
    expect(windCardinal(225)).toBe("SW");
    expect(windCardinal(360)).toBe("N");
  });
});

describe("forecastVisibility", () => {
  it("hides both sections until the current block has been measured", () => {
    expect(forecastVisibility(400, 0)).toEqual({ showHourly: false, showDaily: false });
  });

  it("hides both sections when the remaining room is too small", () => {
    expect(forecastVisibility(200, 120)).toEqual({ showHourly: false, showDaily: false });
  });

  it("reveals the hourly strip once there is room for it", () => {
    expect(forecastVisibility(220, 120)).toEqual({ showHourly: true, showDaily: false });
  });

  it("reveals the daily list once there is room for a useful slice", () => {
    expect(forecastVisibility(300, 120)).toEqual({ showHourly: true, showDaily: true });
  });

  it("never reveals sections when the current block overflows the space", () => {
    expect(forecastVisibility(80, 120)).toEqual({ showHourly: false, showDaily: false });
  });
});
