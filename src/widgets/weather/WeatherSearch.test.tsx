// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/weather/lib/open-meteo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/weather/lib/open-meteo")>()),
  searchPlaces: vi.fn(),
}));

import { WeatherSearch } from "@/widgets/weather/WeatherSearch";
import { searchPlaces } from "@/widgets/weather/lib/open-meteo";
import { useWeatherStore } from "@/widgets/weather/useWeatherStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { makeLocationId, WEATHER_METRICS, type GeocodeResult } from "@/widgets/weather/types";

const ID = "weather-search";
const searchMock = vi.mocked(searchPlaces);

function place(id: number, name: string, latitude: number): GeocodeResult {
  return { id, name, label: name, latitude, longitude: 2 };
}

const LONDON = place(1, "London", 51.5);
const LISBON = place(2, "Lisbon", 38.7);

beforeEach(() => {
  vi.clearAllMocks();
  searchMock.mockResolvedValue([LONDON, LISBON]);
  useWeatherStore.setState({
    byInstance: {
      [ID]: {
        locations: [
          {
            id: makeLocationId(LONDON.latitude, LONDON.longitude),
            name: "London",
            latitude: LONDON.latitude,
            longitude: LONDON.longitude,
          },
        ],
        units: "metric",
        windUnit: "auto",
        forecastDays: "5",
        rainAlert: "likely",
        metrics: [...WEATHER_METRICS],
        selectedId: null,
      },
    },
  });
});

async function openAndSearch() {
  render(
    <WidgetInstanceContext.Provider value={ID}>
      <WeatherSearch />
    </WidgetInstanceContext.Provider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Search for a location" }));
  const input = await screen.findByRole("combobox", { name: "Search for a location" });
  fireEvent.change(input, { target: { value: "lon" } });
  await waitFor(() => expect(screen.getByText("Lisbon")).toBeInTheDocument(), { timeout: 3000 });
  return input;
}

describe("WeatherSearch", () => {
  it("puts the cursor on a city that can still be added, not one already on the list", async () => {
    const input = await openAndSearch();

    expect(input).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: /Lisbon/ }).id,
    );
  });

  it("arrow keys skip cities that are already on the list", async () => {
    const input = await openAndSearch();
    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(input).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: /Lisbon/ }).id,
    );
  });
});
