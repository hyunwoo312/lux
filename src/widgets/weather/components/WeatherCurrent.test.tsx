// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeatherCurrent } from "@/widgets/weather/components/WeatherCurrent";
import { useWeatherStore } from "@/widgets/weather/useWeatherStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  WEATHER_METRICS,
  type WeatherData,
  type WeatherMetric,
  type WeatherRainAlert,
} from "@/widgets/weather/types";

const ID = "weather-1";

function weather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
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
      precipitationSum: null,
      precipitationChance: null,
    },
    sunrise: "2026-06-26T05:30",
    sunset: "2026-06-26T20:45",
    uvIndex: 3,
    hourly: [
      {
        time: "2026-06-26T11:00",
        temperature: 21,
        weatherCode: 61,
        precipitationProbability: 35,
        isDay: true,
      },
    ],
    daily: [
      {
        date: "2026-06-26",
        weatherCode: 1,
        max: 25,
        min: 15,
        precipitationSum: null,
        precipitationChance: null,
      },
    ],
    minutely: [],
    unitLabels: { temperature: "°C", windSpeed: "mph" },
    ...overrides,
  };
}

function seed(metrics: WeatherMetric[], rainAlert: WeatherRainAlert = "likely") {
  useWeatherStore.setState({
    byInstance: {
      [ID]: {
        locations: [],
        units: "metric",
        windUnit: "auto",
        forecastDays: "5",
        rainAlert,
        metrics,
        selectedId: null,
        searchOpen: false,
      },
    },
  });
}

function renderCurrent(data: WeatherData = weather()) {
  return render(
    <TooltipProvider>
      <WidgetInstanceContext.Provider value={ID}>
        <WeatherCurrent data={data} name="Anywhere" />
      </WidgetInstanceContext.Provider>
    </TooltipProvider>,
  );
}

function readingsRow(): HTMLElement | null {
  return document.querySelector(".flex-wrap");
}

beforeEach(() => {
  seed([...WEATHER_METRICS]);
});

describe("WeatherCurrent readings", () => {
  it("drops a reading that was turned off", () => {
    seed(["humidity"]);
    renderCurrent();

    expect(screen.queryByText("Feels like")).not.toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("hides the whole row when every reading is off", () => {
    seed([]);
    renderCurrent();

    expect(readingsRow()).toBeNull();
  });

  it("hides the whole row when the only chosen reading has no value", () => {
    seed(["uv"]);
    renderCurrent(weather({ uvIndex: null }));

    expect(readingsRow()).toBeNull();
  });
});

describe("WeatherCurrent rain alert", () => {
  it("stays quiet at 35% odds when set to likely", () => {
    renderCurrent();

    expect(screen.queryByText(/Rain/)).not.toBeInTheDocument();
  });

  it("warns at 35% odds when set to chance", () => {
    seed([...WEATHER_METRICS], "chance");
    renderCurrent();

    expect(screen.getByText(/Rain within the hour/)).toBeInTheDocument();
  });

  it("stays quiet when the alert is off", () => {
    seed([...WEATHER_METRICS], "off");
    renderCurrent();

    expect(screen.queryByText(/Rain/)).not.toBeInTheDocument();
  });
});
