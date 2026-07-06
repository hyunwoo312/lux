import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import { invalidatePolledResource } from "@/widgets/core/usePolledResource";
import { syncCooldownRemainingMs } from "@/widgets/core/syncCooldown";
import { makeLocationId, type WeatherLocation, type WeatherUnits } from "@/widgets/weather/types";

export const MAX_LOCATIONS = 10;
export const WEATHER_SYNC_COOLDOWN_MS = 300_000;

type WeatherData = {
  locations: WeatherLocation[];
  units: WeatherUnits;
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
  openSearch: (instanceId: string) => void;
  closeSearch: (instanceId: string) => void;
  beginSync: (instanceId: string) => void;
  endSync: (instanceId: string) => void;
  reportSynced: (instanceId: string, at: number) => void;
  requestRefresh: (instanceId: string) => void;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_DATA: WeatherData = {
  locations: [],
  units: "imperial",
  selectedId: null,
  searchOpen: false,
};

const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

const configSchema = z.object({
  locations: z.array(locationSchema).max(MAX_LOCATIONS).default([]),
  units: z.enum(["metric", "imperial"]).default("imperial"),
});

const persistedSchema = z.object({
  byInstance: z.record(z.string(), configSchema),
});

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

function migrateLegacyToConfig(persisted: unknown): { locations: WeatherLocation[]; units: WeatherUnits } {
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
          invalidatePolledResource(
            `weather:${location.latitude},${location.longitude},${inst.units}`,
          );
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
            { locations: data.locations, units: data.units },
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
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        const byInstance: Record<string, WeatherData> = {};
        for (const [id, data] of Object.entries(parsed.data.byInstance)) {
          byInstance[id] = {
            locations: data.locations,
            units: data.units,
            selectedId: null,
            searchOpen: false,
          };
        }
        return { ...current, byInstance };
      },
    },
  ),
);

registerInstanceCleanup((instanceId) => useWeatherStore.getState().removeInstance(instanceId));

export const useWeather = createInstanceSelector(useWeatherStore, DEFAULT_DATA);
