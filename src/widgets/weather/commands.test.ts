// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/weather/lib/open-meteo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/weather/lib/open-meteo")>()),
  fetchWeather: vi.fn(),
  searchPlaces: vi.fn(),
}));

import { fetchWeather, searchPlaces } from "@/widgets/weather/lib/open-meteo";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { weatherCommands } from "@/widgets/weather/commands";
import { useWeatherStore } from "@/widgets/weather/useWeatherStore";

function place(...ids: string[]) {
  useDashboardStore.setState({ widgets: ids.map((id) => ({ id, type: "weather" as const })) });
}

async function run(id: string, query: string) {
  const command = weatherCommands().find((entry) => entry.id === id);
  if (command?.kind !== "provider") throw new Error(`expected a ${id} scope`);
  return command.search(query, new AbortController().signal);
}

beforeEach(() => {
  vi.clearAllMocks();
  clearPolledResources();
  localStorage.clear();
  place();
  useWeatherStore.setState({ byInstance: {} });
});

const FORECAST = {
  current: { temperature: 21.4, windSpeed: 12.3, humidity: 48 },
  today: { max: 25.6, min: 14.2 },
  unitLabels: { windSpeed: "mph" },
};

describe("weatherCommands", () => {
  it("shows a saved place with its conditions and today's range", async () => {
    place("w1");
    vi.mocked(fetchWeather).mockResolvedValue(FORECAST as never);

    const [row] = await run("weather.locations", "");

    expect(row).toMatchObject({
      detail: "21° · 12 mph · 48% humidity",
      meta: "H 26° · L 14°",
      section: "Your places",
    });
    expect(fetchWeather).toHaveBeenCalledTimes(1);
  });

  it("offers a new place alongside the saved ones, and adds the one you pick", async () => {
    place("w1");
    vi.mocked(fetchWeather).mockResolvedValue(FORECAST as never);
    vi.mocked(searchPlaces).mockResolvedValue([
      { id: 1, name: "Porto", label: "Porto, Portugal", latitude: 41.15, longitude: -8.61 },
    ]);

    const rows = await run("weather.locations", "porto");
    const add = rows.find((row) => row.section === "Add a place");
    await add?.run();

    const names = useWeatherStore.getState().byInstance.w1?.locations.map((l) => l.name);
    expect(names).toContain("Porto");
  });
});
