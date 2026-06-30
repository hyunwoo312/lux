import { beforeEach, describe, expect, it } from "vitest";
import { MAX_LOCATIONS, useWeatherStore } from "@/widgets/weather/useWeatherStore";
import { makeLocationId, type WeatherLocation } from "@/widgets/weather/types";

const store = () => useWeatherStore.getState();
const ID = "weather-1";
const data = (instanceId: string) => store().byInstance[instanceId];

function city(id: string): WeatherLocation {
  return { id, name: id, latitude: 1, longitude: 2 };
}

beforeEach(() => {
  useWeatherStore.setState({
    byInstance: { [ID]: { locations: [], units: "metric", selectedId: null, searchOpen: false } },
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

  it("selects and clears the active city", () => {
    store().selectCity(ID, "a");
    expect(data(ID)?.selectedId).toBe("a");
    store().clearSelection(ID);
    expect(data(ID)?.selectedId).toBeNull();
  });

  it("keeps instances independent", () => {
    useWeatherStore.setState({
      byInstance: {
        a: { locations: [], units: "metric", selectedId: null, searchOpen: false },
        b: { locations: [], units: "metric", selectedId: null, searchOpen: false },
      },
    });
    store().addLocation("a", city("x"));
    store().addLocation("b", city("y"));
    expect(data("a")?.locations.map((entry) => entry.id)).toEqual(["x"]);
    expect(data("b")?.locations.map((entry) => entry.id)).toEqual(["y"]);
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

      expect(migrate?.(config, 2)).toEqual({ byInstance: { weather: config } });
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

  it("differs for distinct places", () => {
    expect(makeLocationId(51.5, -0.12)).not.toBe(makeLocationId(35.68, 139.69));
  });
});
