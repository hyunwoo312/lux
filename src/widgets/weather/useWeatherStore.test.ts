import { beforeEach, describe, expect, it } from "vitest";
import { MAX_LOCATIONS, useWeatherStore } from "@/widgets/weather/useWeatherStore";
import { makeLocationId, type WeatherLocation } from "@/widgets/weather/types";

const store = () => useWeatherStore.getState();

function city(id: string): WeatherLocation {
  return { id, name: id, latitude: 1, longitude: 2 };
}

beforeEach(() => {
  useWeatherStore.setState({ locations: [], units: "metric", selectedId: null });
});

describe("useWeatherStore", () => {
  it("adds a location", () => {
    store().addLocation(city("a"));
    expect(store().locations.map((entry) => entry.id)).toEqual(["a"]);
  });

  it("ignores a duplicate id", () => {
    store().addLocation(city("a"));
    store().addLocation(city("a"));
    expect(store().locations).toHaveLength(1);
  });

  it(`caps locations at ${MAX_LOCATIONS}`, () => {
    for (let index = 0; index < MAX_LOCATIONS + 2; index += 1) {
      store().addLocation(city(`c${index}`));
    }
    expect(store().locations).toHaveLength(MAX_LOCATIONS);
  });

  it("removes a location", () => {
    store().addLocation(city("a"));
    store().addLocation(city("b"));
    store().removeLocation("a");
    expect(store().locations.map((entry) => entry.id)).toEqual(["b"]);
  });

  it("clears the selection when the selected city is removed", () => {
    store().addLocation(city("a"));
    store().selectCity("a");
    store().removeLocation("a");
    expect(store().selectedId).toBeNull();
  });

  it("keeps the selection when another city is removed", () => {
    store().addLocation(city("a"));
    store().addLocation(city("b"));
    store().selectCity("a");
    store().removeLocation("b");
    expect(store().selectedId).toBe("a");
  });

  it("reorders a location to another position", () => {
    store().addLocation(city("a"));
    store().addLocation(city("b"));
    store().addLocation(city("c"));
    store().reorderLocations("a", "c");
    expect(store().locations.map((entry) => entry.id)).toEqual(["b", "c", "a"]);
  });

  it("ignores a reorder onto itself", () => {
    store().addLocation(city("a"));
    store().addLocation(city("b"));
    store().reorderLocations("a", "a");
    expect(store().locations.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("selects and clears the active city", () => {
    store().selectCity("a");
    expect(store().selectedId).toBe("a");
    store().clearSelection();
    expect(store().selectedId).toBeNull();
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
