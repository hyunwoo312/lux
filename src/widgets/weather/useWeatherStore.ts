import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { makeLocationId, type WeatherLocation, type WeatherUnits } from "@/widgets/weather/types";

export const MAX_LOCATIONS = 10;

type WeatherState = {
  locations: WeatherLocation[];
  units: WeatherUnits;
  selectedId: string | null;
  searchOpen: boolean;
  addLocation: (location: WeatherLocation) => void;
  removeLocation: (id: string) => void;
  reorderLocations: (activeId: string, overId: string) => void;
  selectCity: (id: string) => void;
  clearSelection: () => void;
  setUnits: (units: WeatherUnits) => void;
  openSearch: () => void;
  closeSearch: () => void;
};

const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

const persistedSchema = z.object({
  locations: z.array(locationSchema).max(MAX_LOCATIONS).default([]),
  units: z.enum(["metric", "imperial"]).default("imperial"),
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

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set, get) => ({
      locations: [],
      units: "imperial",
      selectedId: null,
      searchOpen: false,
      addLocation: (location) => {
        const { locations } = get();
        if (locations.length >= MAX_LOCATIONS) return;
        if (locations.some((entry) => entry.id === location.id)) return;
        set({ locations: [...locations, location] });
      },
      removeLocation: (id) =>
        set((state) => ({
          locations: state.locations.filter((entry) => entry.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
        })),
      reorderLocations: (activeId, overId) =>
        set((state) => {
          const from = state.locations.findIndex((entry) => entry.id === activeId);
          const to = state.locations.findIndex((entry) => entry.id === overId);
          if (from === -1 || to === -1 || from === to) return state;
          const locations = [...state.locations];
          const [moved] = locations.splice(from, 1);
          if (!moved) return state;
          locations.splice(to, 0, moved);
          return { locations };
        }),
      selectCity: (id) => set({ selectedId: id }),
      clearSelection: () => set({ selectedId: null }),
      setUnits: (units) => set({ units }),
      openSearch: () => set({ searchOpen: true }),
      closeSearch: () => set({ searchOpen: false }),
    }),
    {
      name: "widget:weather",
      storage: gatedStorage,
      version: 2,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({ locations: state.locations, units: state.units }),
      migrate: (persisted, version) => {
        if (version >= 2) return persisted;
        const legacy = legacySchema.safeParse(persisted);
        if (!legacy.success) return persisted;
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
      },
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);
