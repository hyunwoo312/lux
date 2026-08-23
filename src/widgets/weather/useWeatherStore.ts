import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { mergePersisted, tolerantArray, tolerantRecord } from "@/lib/persist";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import { invalidatePolledResource } from "@/widgets/core/usePolledResource";
import { syncCooldownRemainingMs } from "@/widgets/core/syncCooldown";
import { weatherCacheKey } from "@/widgets/weather/lib/open-meteo";
import {
  makeLocationId,
  WEATHER_FORECAST_DAYS,
  WEATHER_METRICS,
  WEATHER_RAIN_ALERTS,
  WEATHER_WIND_UNITS,
  type WeatherForecastDays,
  type WeatherLocation,
  type WeatherMetric,
  type WeatherRainAlert,
  type WeatherUnits,
  type WeatherWindUnit,
} from "@/widgets/weather/types";

export const MAX_LOCATIONS = 10;
export const WEATHER_SYNC_COOLDOWN_MS = 300_000;

type WeatherData = {
  locations: WeatherLocation[];
  units: WeatherUnits;
  windUnit: WeatherWindUnit;
  forecastDays: WeatherForecastDays;
  rainAlert: WeatherRainAlert;
  metrics: WeatherMetric[];
  selectedId: string | null;
  searchOpen: boolean;
};

type WeatherState = {
  byInstance: Record<string, WeatherData>;
  syncNonce: Record<string, number>;
  lastSyncAt: Record<string, number>;
  dataSyncedAt: Record<string, number>;
  syncing: Record<string, number>;
  addLocation: (instanceId: string, location: WeatherLocation) => void;
  removeLocation: (instanceId: string, id: string) => void;
  reorderLocations: (instanceId: string, activeId: string, overId: string) => void;
  selectCity: (instanceId: string, id: string) => void;
  clearSelection: (instanceId: string) => void;
  setUnits: (instanceId: string, units: WeatherUnits) => void;
  setWindUnit: (instanceId: string, windUnit: WeatherWindUnit) => void;
  setForecastDays: (instanceId: string, forecastDays: WeatherForecastDays) => void;
  setRainAlert: (instanceId: string, rainAlert: WeatherRainAlert) => void;
  setMetrics: (instanceId: string, metrics: WeatherMetric[]) => void;
  openSearch: (instanceId: string) => void;
  closeSearch: (instanceId: string) => void;
  beginSync: (instanceId: string) => void;
  endSync: (instanceId: string) => void;
  reportSynced: (instanceId: string, at: number) => void;
  requestRefresh: (instanceId: string) => void;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_LOCATION: WeatherLocation = {
  id: makeLocationId(40.7128, -74.006),
  name: "New York",
  latitude: 40.7128,
  longitude: -74.006,
};

const DEFAULT_DATA: WeatherData = {
  locations: [DEFAULT_LOCATION],
  units: "imperial",
  windUnit: "auto",
  forecastDays: "5",
  rainAlert: "likely",
  metrics: [...WEATHER_METRICS],
  selectedId: DEFAULT_LOCATION.id,
  searchOpen: false,
};

const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

const configSchema = z.object({
  locations: tolerantArray(locationSchema),
  units: z.enum(["metric", "imperial"]).catch("imperial"),
  windUnit: z.enum(WEATHER_WIND_UNITS).catch("auto"),
  forecastDays: z.enum(WEATHER_FORECAST_DAYS).catch("5"),
  rainAlert: z.enum(WEATHER_RAIN_ALERTS).catch("likely"),
  metrics: tolerantArray(z.enum(WEATHER_METRICS)).default([...WEATHER_METRICS]),
  selectedId: z.string().nullable().catch(null),
});

const persistedSchema = z.object({ byInstance: tolerantRecord(configSchema) });

const legacySchema = z.object({
  location: locationSchema
    .omit({ id: true })
    .extend({ id: z.string().optional() })
    .nullable()
    .optional(),
  units: z.enum(["metric", "imperial"]).optional(),
});

const gatedStorage = createGatedChromeStorage();

function update(
  state: WeatherState,
  instanceId: string,
  fn: (data: WeatherData) => WeatherData,
): Pick<WeatherState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, fn) };
}

function migrateLegacyToConfig(persisted: unknown): {
  locations: WeatherLocation[];
  units: WeatherUnits;
} {
  const legacy = legacySchema.safeParse(persisted);
  if (!legacy.success) return { locations: [], units: "imperial" };
  const previous = legacy.data.location;
  return {
    locations: previous
      ? [
          {
            id: previous.id ?? makeLocationId(previous.latitude, previous.longitude),
            name: previous.name,
            latitude: previous.latitude,
            longitude: previous.longitude,
          },
        ]
      : [],
    units: legacy.data.units ?? "imperial",
  };
}

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set, get) => ({
      byInstance: {},
      syncNonce: {},
      lastSyncAt: {},
      dataSyncedAt: {},
      syncing: {},
      addLocation: (instanceId, location) =>
        set((state) => {
          const data = state.byInstance[instanceId] ?? DEFAULT_DATA;
          if (data.locations.length >= MAX_LOCATIONS) return state;
          if (data.locations.some((entry) => entry.id === location.id)) return state;
          return update(state, instanceId, (current) => ({
            ...current,
            locations: [...current.locations, location],
            selectedId: location.id,
          }));
        }),
      removeLocation: (instanceId, id) =>
        set((state) =>
          update(state, instanceId, (data) => ({
            ...data,
            locations: data.locations.filter((entry) => entry.id !== id),
            selectedId: data.selectedId === id ? null : data.selectedId,
          })),
        ),
      reorderLocations: (instanceId, activeId, overId) =>
        set((state) => {
          const data = state.byInstance[instanceId] ?? DEFAULT_DATA;
          const from = data.locations.findIndex((entry) => entry.id === activeId);
          const to = data.locations.findIndex((entry) => entry.id === overId);
          if (from === -1 || to === -1 || from === to) return state;
          const locations = [...data.locations];
          const [moved] = locations.splice(from, 1);
          if (!moved) return state;
          locations.splice(to, 0, moved);
          return update(state, instanceId, (current) => ({ ...current, locations }));
        }),
      selectCity: (instanceId, id) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, selectedId: id }))),
      clearSelection: (instanceId) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, selectedId: null }))),
      setUnits: (instanceId, units) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, units }))),
      setWindUnit: (instanceId, windUnit) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, windUnit }))),
      setForecastDays: (instanceId, forecastDays) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, forecastDays }))),
      setRainAlert: (instanceId, rainAlert) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, rainAlert }))),
      setMetrics: (instanceId, metrics) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, metrics }))),
      openSearch: (instanceId) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, searchOpen: true }))),
      closeSearch: (instanceId) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, searchOpen: false }))),
      beginSync: (instanceId) =>
        set((state) => ({
          syncing: { ...state.syncing, [instanceId]: (state.syncing[instanceId] ?? 0) + 1 },
        })),
      endSync: (instanceId) =>
        set((state) => ({
          syncing: {
            ...state.syncing,
            [instanceId]: Math.max(0, (state.syncing[instanceId] ?? 0) - 1),
          },
        })),
      reportSynced: (instanceId, at) =>
        set((state) =>
          at > (state.dataSyncedAt[instanceId] ?? 0)
            ? { dataSyncedAt: { ...state.dataSyncedAt, [instanceId]: at } }
            : state,
        ),
      requestRefresh: (instanceId) => {
        if (syncCooldownRemainingMs(get().lastSyncAt[instanceId], WEATHER_SYNC_COOLDOWN_MS) > 0) {
          return;
        }
        const inst = get().byInstance[instanceId];
        if (!inst) return;
        for (const location of inst.locations) {
          invalidatePolledResource(weatherCacheKey(location, inst.units, inst.windUnit));
        }
        set((state) => ({
          syncNonce: { ...state.syncNonce, [instanceId]: (state.syncNonce[instanceId] ?? 0) + 1 },
          lastSyncAt: { ...state.lastSyncAt, [instanceId]: Date.now() },
        }));
      },
      removeInstance: (instanceId) =>
        set((state) => ({
          byInstance: dropInstance(state.byInstance, instanceId),
          syncNonce: dropInstance(state.syncNonce, instanceId),
          lastSyncAt: dropInstance(state.lastSyncAt, instanceId),
          dataSyncedAt: dropInstance(state.dataSyncedAt, instanceId),
          syncing: dropInstance(state.syncing, instanceId),
        })),
    }),
    {
      name: "widget:weather",
      storage: gatedStorage,
      version: 3,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({
        byInstance: Object.fromEntries(
          Object.entries(state.byInstance).map(([id, data]) => [
            id,
            {
              locations: data.locations,
              units: data.units,
              windUnit: data.windUnit,
              forecastDays: data.forecastDays,
              rainAlert: data.rainAlert,
              metrics: data.metrics,
              selectedId: data.selectedId,
            },
          ]),
        ),
      }),
      migrate: (persisted, version) => {
        if (version >= 3) return persisted;
        if (version < 2) {
          return { byInstance: { weather: migrateLegacyToConfig(persisted) } };
        }
        const v2 = configSchema.safeParse(persisted);
        return {
          byInstance: { weather: v2.success ? v2.data : { locations: [], units: "imperial" } },
        };
      },
      merge: (persisted, current) =>
        mergePersisted("widget:weather", persistedSchema, persisted, current, (parsed) => {
          const byInstance: Record<string, WeatherData> = {};
          for (const [id, data] of Object.entries(parsed.byInstance)) {
            byInstance[id] = {
              locations: data.locations.slice(0, MAX_LOCATIONS),
              units: data.units,
              windUnit: data.windUnit,
              forecastDays: data.forecastDays,
              rainAlert: data.rainAlert,
              metrics: data.metrics,
              selectedId: data.selectedId,
              searchOpen: false,
            };
          }
          return { ...current, byInstance };
        }),
    },
  ),
);

registerInstanceCleanup((instanceId) => useWeatherStore.getState().removeInstance(instanceId));

export const useWeather = createInstanceSelector(useWeatherStore, DEFAULT_DATA);
