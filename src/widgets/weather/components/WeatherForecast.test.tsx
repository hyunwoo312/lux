// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useElementSize", () => ({
  useElementSize: () => [() => undefined, { width: 320, height: 80 }],
}));

import { WeatherForecast } from "@/widgets/weather/components/WeatherForecast";
import { useWeatherStore } from "@/widgets/weather/useWeatherStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { WeatherData, WeatherDay, WeatherHour } from "@/widgets/weather/types";

const ID = "weather-forecast";

function hour(time: string, temperature: number, precipitationProbability = 0): WeatherHour {
  return { time, temperature, weatherCode: 1, precipitationProbability, isDay: true };
}

function day(date: string, min: number, max: number, chance: number | null = null): WeatherDay {
  return {
    date,
    weatherCode: 1,
    max,
    min,
    precipitationSum: null,
    precipitationChance: chance,
  };
}

function weather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    current: {
      time: "2026-06-26T10:30",
      temperature: 20,
      apparentTemperature: 19,
      humidity: 50,
      windSpeed: 5,
      windGusts: 9,
      windDirection: 180,
      weatherCode: 1,
      isDay: true,
    },
    today: day("2026-06-26", 15, 25),
    sunrise: "2026-06-26T05:30",
    sunset: "2026-06-26T20:45",
    uvIndex: 3,
    hourly: Array.from({ length: 40 }, (_, index) =>
      hour(`2026-06-26T${String(index % 24).padStart(2, "0")}:00`, 10 + index),
    ),
    minutely: [],
    daily: [day("2026-06-26", 15, 25), day("2026-06-27", 16, 26, 70), day("2026-06-28", 14, 22)],
    unitLabels: { temperature: "°C", windSpeed: "mph" },
    ...overrides,
  };
}

function seed(forecastDays: "3" | "5" | "7" = "3") {
  useWeatherStore.setState({
    byInstance: {
      [ID]: {
        locations: [],
        units: "metric",
        windUnit: "auto",
        forecastDays,
        rainAlert: "likely",
        metrics: [],
        selectedId: null,
        searchOpen: false,
      },
    },
  });
}

function renderForecast(data = weather(), showHourly = true, showDaily = true) {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <WeatherForecast data={data} showHourly={showHourly} showDaily={showDaily} />
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => seed());

describe("WeatherForecast", () => {
  it("describes the hourly chart for anyone who cannot see it", () => {
    renderForecast();
    expect(
      screen.getByRole("img", { name: /Temperature over the next \d+ hours/ }),
    ).toBeInTheDocument();
  });

  it("includes the hour you are in, not only the ones ahead", () => {
    renderForecast();
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Temperature over the next \d+ hours, 20° to/ }),
    ).toBeInTheDocument();
  });

  it("shows one temperature callout when the whole window is flat", () => {
    const flat = weather({
      hourly: Array.from({ length: 30 }, (_, index) =>
        hour(`2026-06-26T${String(index % 24).padStart(2, "0")}:00`, 18),
      ),
    });
    renderForecast(flat);
    expect(screen.getAllByText("18°")).toHaveLength(1);
  });

  it("shows the chance of rain only when a day is likely enough to matter", () => {
    renderForecast();
    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("leaves the hourly chart out when there is no room for it", () => {
    renderForecast(weather(), false, true);
    expect(screen.queryByRole("img", { name: /Temperature over/ })).not.toBeInTheDocument();
  });
});
