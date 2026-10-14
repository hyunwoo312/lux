// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/hooks/useElementSize", () => ({
  useElementSize: () => [() => undefined, { width: 320, height: 80 }],
}));

import { WeatherForecast } from "@/widgets/weather/components/WeatherForecast";
import { useWeatherStore } from "@/widgets/weather/useWeatherStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { WeatherData, WeatherDay, WeatherHour } from "@/widgets/weather/types";

const ID = "weather-forecast";

function hour(time: string, temperature: number, precipitationProbability = 0): WeatherHour {
  return { time, temperature, weatherCode: 1, precipitationProbability };
}

function day(date: string, min: number, max: number, chance: number | null = null): WeatherDay {
  return {
    date,
    weatherCode: 1,
    max,
    min,
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
    hourly: Array.from({ length: 48 }, (_, index) =>
      hour(new Date(Date.UTC(2026, 5, 26, index)).toISOString().slice(0, 16), 10 + index),
    ),
    minutely: [],
    daily: [day("2026-06-26", 15, 25), day("2026-06-27", 16, 26, 70), day("2026-06-28", 14, 22)],
    unitLabels: { windSpeed: "mph" },
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
      },
    },
  });
}

function renderForecast(data = weather()) {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <WeatherForecast data={data} />
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => seed());

describe("WeatherForecast", () => {
  it("exposes the chosen hour and units through a keyboard-accessible chart", () => {
    renderForecast();
    expect(screen.getByRole("slider", { name: "Temperature hourly forecast" })).toBeInTheDocument();
  });

  it("includes the hour you are in, not only the ones ahead", () => {
    renderForecast();
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "10");
    expect(screen.getByRole("slider")).toHaveAttribute(
      "aria-valuetext",
      expect.stringContaining("20°C"),
    );
  });

  it("selects a future day without calling its first hour Now", () => {
    renderForecast();
    fireEvent.click(screen.getByRole("button", { name: /^Sat 27, low/ }));
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("slider")).toHaveAttribute(
      "aria-valuetext",
      expect.stringContaining("34°C"),
    );
    expect(screen.queryByText("Now")).not.toBeInTheDocument();
  });

  it("keeps hour identity and updates readings when forecasts refresh", () => {
    const original = weather();
    const { rerender } = renderForecast(original);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "11");
    rerender(
      <WidgetInstanceContext.Provider value={ID}>
        <WeatherForecast
          data={{
            ...original,
            hourly: original.hourly.map((entry) => ({
              ...entry,
              temperature: entry.temperature + 1,
            })),
          }}
        />
      </WidgetInstanceContext.Provider>,
    );
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "11");
    expect(screen.getByRole("slider")).toHaveAttribute(
      "aria-valuetext",
      expect.stringContaining("22°C"),
    );
  });

  it("handles unavailable days without inventing an hourly reading", () => {
    renderForecast();
    fireEvent.click(screen.getByRole("button", { name: /^Sun 28, low/ }));
    expect(screen.getByText("No hourly forecast for this day")).toBeInTheDocument();
    expect(screen.getByRole("slider")).toHaveAttribute("tabindex", "-1");
  });

  it("shows the chance of rain only when a day is likely enough to matter", () => {
    renderForecast();
    expect(screen.getByText("70%")).toBeInTheDocument();
  });
});
