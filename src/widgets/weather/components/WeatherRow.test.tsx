// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/widgets/weather/hooks/useWeatherResource", () => ({
  useWeatherResource: () => ({
    state: { status: "error", error: new Error("offline") },
    refresh: vi.fn(),
    isRefreshing: false,
  }),
}));

import { WeatherRow } from "@/widgets/weather/components/WeatherRow";

describe("WeatherRow", () => {
  it("says the city could not load rather than drawing it as overcast", () => {
    render(
      <WeatherRow
        location={{ id: "a", name: "Anywhere", latitude: 1, longitude: 2 }}
        units="metric"
        windUnit="auto"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Couldn’t load Anywhere" })).toBeInTheDocument();
  });
});
