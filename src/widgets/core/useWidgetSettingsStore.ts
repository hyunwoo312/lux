import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { keepPersisted, mergePersisted, tolerantRecord } from "@/lib/persist";
import { dropInstance } from "@/widgets/core/byInstance";

export type WidgetBackground = "glass" | "solid";

export const SURFACE_PREFERENCES = ["glass", "solid", "custom"] as const;
export type SurfacePreference = (typeof SURFACE_PREFERENCES)[number];

export const DEFAULT_BACKGROUND: WidgetBackground = "glass";

type WidgetSettings = {
  background?: WidgetBackground;
};

type WidgetSettingsState = {
  settings: Record<string, WidgetSettings>;
  surfacePreference: SurfacePreference;
  setBackground: (id: string, background: WidgetBackground) => void;
  applyBackgroundToAll: (ids: string[], background: WidgetBackground) => void;
  removeInstance: (id: string) => void;
};

const settingsSchema = z.object({
  background: z.enum(["glass", "solid"]).catch(DEFAULT_BACKGROUND).optional(),
});

const persistedSchema = z.object({
  settings: tolerantRecord(settingsSchema),
  surfacePreference: z.enum(SURFACE_PREFERENCES).catch("custom"),
});

const gatedStorage = createGatedChromeStorage();

export const useWidgetSettingsStore = create<WidgetSettingsState>()(
  persist(
    (set) => ({
      settings: {},
      surfacePreference: DEFAULT_BACKGROUND,
      setBackground: (id, background) =>
        set((state) => ({
          settings: { ...state.settings, [id]: { ...state.settings[id], background } },
          surfacePreference: "custom",
        })),
      applyBackgroundToAll: (ids, background) =>
        set((state) => {
          const settings = { ...state.settings };
          for (const id of ids) settings[id] = { ...settings[id], background };
          return { settings, surfacePreference: background };
        }),
      removeInstance: (id) => set((state) => ({ settings: dropInstance(state.settings, id) })),
    }),
    {
      name: "widget:settings",
      storage: gatedStorage,
      version: 1,
      migrate: keepPersisted,
      onRehydrateStorage: () => () => gatedStorage.open(useWidgetSettingsStore),
      partialize: (state) => ({
        settings: state.settings,
        surfacePreference: state.surfacePreference,
      }),
      merge: (persisted, current) =>
        mergePersisted("widget:settings", persistedSchema, persisted, current, (parsed) => ({
          ...current,
          settings: parsed.settings,
          surfacePreference: parsed.surfacePreference,
        })),
    },
  ),
);

export function useWidgetBackground(id: string): WidgetBackground {
  return useWidgetSettingsStore((s) => {
    const explicit = s.settings[id]?.background;
    if (explicit) return explicit;
    return s.surfacePreference === "custom" ? DEFAULT_BACKGROUND : s.surfacePreference;
  });
}
