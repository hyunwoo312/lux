import { expect, it } from "vitest";
import { forecastChart } from "@/widgets/weather/lib/forecast-chart";
import type { WeatherHour } from "@/widgets/weather/types";

it("keeps missing hours as actual gaps on the time axis and selects the nearest supplied hour", () => {
  const hours: WeatherHour[] = [0, 1, 4].map((hour) => ({
    time: `2026-10-14T0${hour}:00`,
    temperature: 20,
    weatherCode: 1,
    precipitationProbability: null,
  }));
  const chart = forecastChart(hours, "temperature", 330, 60, hours[1] ?? null);
  expect(chart.xFor(0)).toBe(5);
  expect(chart.xFor(1)).toBe(85);
  expect(chart.xFor(2)).toBe(325);
  expect(chart.indexAt(160)).toBe(1);
  expect(chart.segments).toHaveLength(2);
});
