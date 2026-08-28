import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_LOCATIONS, useWeatherStore } from "@/widgets/weather/useWeatherStore";
import { makeLocationId, WEATHER_METRICS, type WeatherLocation } from "@/widgets/weather/types";

const store = () => useWeatherStore.getState();
const ID = "weather-1";
const data = (instanceId: string) => store().byInstance[instanceId];

type WeatherInstance = NonNullable<ReturnType<typeof data>>;

function reloaded() {
  const { partialize, merge } = useWeatherStore.persist.getOptions();
  const written = JSON.parse(JSON.stringify(partialize?.(store())));
  const restored = merge?.(written, store()) as {
    byInstance: Record<string, WeatherInstance>;
  };
  return restored.byInstance[ID];
}

function city(id: string): WeatherLocation {
  return { id, name: id, latitude: 1, longitude: 2 };
}

function instance(locations: WeatherLocation[] = []): WeatherInstance {
  return {
    locations,
    units: "metric",
    windUnit: "auto",
    forecastDays: "5",
    rainAlert: "likely",
    metrics: [...WEATHER_METRICS],
    selectedId: null,
  };
}

beforeEach(() => {
  useWeatherStore.setState({
    byInstance: { [ID]: instance() },
  });
});

describe("useWeatherStore", () => {
  it("adds a location", () => {
    store().addLocation(ID, city("a"));
    expect(data(ID)?.locations.map((entry) => entry.id)).toEqual(["a"]);
  });

  it("ignores a duplicate id", () => {
    store().addLocation(ID, city("a"));
    store().addLocation(ID, city("a"));
    expect(data(ID)?.locations).toHaveLength(1);
  });

  it(`caps locations at ${MAX_LOCATIONS}`, () => {
    for (let index = 0; index < MAX_LOCATIONS + 2; index += 1) {
      store().addLocation(ID, city(`c${index}`));
    }
    expect(data(ID)?.locations).toHaveLength(MAX_LOCATIONS);
  });

  it("shows the city you just added instead of the one already on screen", () => {
    store().addLocation(ID, city("a"));
    store().addLocation(ID, city("b"));

    expect(data(ID)?.selectedId).toBe("b");
  });

  it("remembers the city you were viewing across a reload", () => {
    store().addLocation(ID, city("a"));
    store().addLocation(ID, city("b"));
    store().selectCity(ID, "a");

    expect(reloaded()?.selectedId).toBe("a");
  });

  it("keeps every reading turned off rather than restoring the defaults", () => {
    store().setMetrics(ID, []);

    expect(reloaded()?.metrics).toEqual([]);
  });

  it("comes back to the list when nothing was selected", () => {
    store().addLocation(ID, city("a"));
    store().addLocation(ID, city("b"));
    store().clearSelection(ID);

    expect(reloaded()?.selectedId).toBeNull();
  });

  it("removes a location", () => {
    store().addLocation(ID, city("a"));
    store().addLocation(ID, city("b"));
    store().removeLocation(ID, "a");
    expect(data(ID)?.locations.map((entry) => entry.id)).toEqual(["b"]);
  });

  it("clears the selection when the selected city is removed", () => {
    store().addLocation(ID, city("a"));
    store().selectCity(ID, "a");
    store().removeLocation(ID, "a");
    expect(data(ID)?.selectedId).toBeNull();
  });

  it("keeps the selection when another city is removed", () => {
    store().addLocation(ID, city("a"));
    store().addLocation(ID, city("b"));
    store().selectCity(ID, "a");
    store().removeLocation(ID, "b");
    expect(data(ID)?.selectedId).toBe("a");
  });

  it("reorders a location to another position", () => {
    store().addLocation(ID, city("a"));
    store().addLocation(ID, city("b"));
    store().addLocation(ID, city("c"));
    store().reorderLocations(ID, "a", "c");
    expect(data(ID)?.locations.map((entry) => entry.id)).toEqual(["b", "c", "a"]);
  });

  it("ignores a reorder onto itself", () => {
    store().addLocation(ID, city("a"));
    store().addLocation(ID, city("b"));
    store().reorderLocations(ID, "a", "a");
    expect(data(ID)?.locations.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("keeps instances independent", () => {
    useWeatherStore.setState({
      byInstance: {
        a: instance(),
        b: instance(),
      },
    });
    store().addLocation("a", city("x"));
    store().addLocation("b", city("y"));
    expect(data("a")?.locations.map((entry) => entry.id)).toEqual(["x"]);
    expect(data("b")?.locations.map((entry) => entry.id)).toEqual(["y"]);
  });

  describe("surviving a corrupt persisted value", () => {
    const { merge } = useWeatherStore.persist.getOptions();
    const city = (id: string) => ({ id, name: `City ${id}`, latitude: 1, longitude: 2 });
    const sound = {
      locations: [city("a")],
      units: "imperial",
      windUnit: "auto",
      forecastDays: "5",
      rainAlert: "likely",
      metrics: [...WEATHER_METRICS],
      selectedId: null,
    };
    const restore = (overrides: Record<string, unknown> = {}) =>
      merge?.({ byInstance: { [ID]: { ...sound, ...overrides } } }, store()) as {
        byInstance: Record<string, WeatherInstance>;
      };

    beforeEach(() => {
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
    });

    it("keeps the cities when a reading this build does not know is stored", () => {
      const entry = restore({ metrics: [...WEATHER_METRICS, "dewPoint"] }).byInstance[ID];
      expect(entry?.locations.map((location) => location.id)).toEqual(["a"]);
      expect(entry?.metrics).toEqual([...WEATHER_METRICS]);
    });

    it("keeps the cities when the forecast length is one this build no longer offers", () => {
      const entry = restore({ forecastDays: "10" }).byInstance[ID];
      expect(entry?.locations).toHaveLength(1);
      expect(entry?.forecastDays).toBe("5");
    });

    it("drops only the unreadable city, not the whole list", () => {
      const entry = restore({
        locations: [city("a"), { ...city("b"), latitude: "51.5" }, city("c")],
      }).byInstance[ID];
      expect(entry?.locations.map((location) => location.id)).toEqual(["a", "c"]);
    });

    it("trims a list that grew past the cap instead of discarding it", () => {
      const many = Array.from({ length: MAX_LOCATIONS + 3 }, (_, index) => city(`c${index}`));
      expect(restore({ locations: many }).byInstance[ID]?.locations).toHaveLength(MAX_LOCATIONS);
    });

    it("ignores a selection pointing at a city that is no longer stored", () => {
      expect(restore({ selectedId: "gone" }).byInstance[ID]?.selectedId).toBeNull();
    });

    it("falls back to a sane unit when units were stored as a number", () => {
      const entry = restore({ units: 1 }).byInstance[ID];
      expect(entry?.locations).toHaveLength(1);
      expect(entry?.units).toBe("imperial");
    });

    it("keeps one widget's cities when another widget is unreadable", () => {
      const restored = merge?.(
        { byInstance: { [ID]: sound, other: "not an object" } },
        store(),
      ) as { byInstance: Record<string, WeatherInstance> };
      expect(restored.byInstance[ID]?.locations).toHaveLength(1);
      expect(restored.byInstance.other).toBeUndefined();
    });
  });

  describe("requestRefresh", () => {
    beforeEach(() => {
      useWeatherStore.setState({
        byInstance: {
          [ID]: instance([city("a")]),
        },
        syncNonce: {},
        lastSyncAt: {},
        syncing: {},
      });
    });

    it("bumps the nonce and records the sync time on first refresh", () => {
      store().requestRefresh(ID);
      expect(store().syncNonce[ID]).toBe(1);
      expect(store().lastSyncAt[ID]).toBeGreaterThan(0);
    });

    it("is a no-op while cooling down", () => {
      store().requestRefresh(ID);
      store().requestRefresh(ID);
      expect(store().syncNonce[ID]).toBe(1);
    });
  });

  describe("migrate", () => {
    const migrate = useWeatherStore.persist.getOptions().migrate;

    it("migrates legacy singleton data under the weather instance key", () => {
      const legacy = {
        location: { name: "London", latitude: 51.5074, longitude: -0.1278 },
        units: "metric",
      };

      expect(migrate?.(legacy, 1)).toEqual({
        byInstance: {
          weather: {
            locations: [
              {
                id: makeLocationId(51.5074, -0.1278),
                name: "London",
                latitude: 51.5074,
                longitude: -0.1278,
              },
            ],
            units: "metric",
          },
        },
      });
    });

    it("drops unrecognized legacy data", () => {
      expect(migrate?.({ location: "nope" }, 1)).toEqual({
        byInstance: { weather: { locations: [], units: "imperial" } },
      });
    });

    it("wraps a v2 singleton config under the weather instance key", () => {
      const config = {
        locations: [{ id: ID, name: "London", latitude: 51.5074, longitude: -0.1278 }],
        units: "metric",
      };

      expect(migrate?.(config, 2)).toEqual({
        byInstance: {
          weather: {
            ...config,
            windUnit: "auto",
            forecastDays: "5",
            rainAlert: "likely",
            metrics: [...WEATHER_METRICS],
            selectedId: null,
          },
        },
      });
    });

    it("passes current-version data through unchanged", () => {
      const persisted = { byInstance: { [ID]: { locations: [], units: "imperial" } } };
      expect(migrate?.(persisted, 3)).toBe(persisted);
    });
  });
});

describe("makeLocationId", () => {
  it("is stable for the same rounded coordinates", () => {
    expect(makeLocationId(51.5074, -0.1278)).toBe(makeLocationId(51.50739, -0.12779));
  });
});
