import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import { SPOTIFY_TIME_DISPLAY_MODES, type SpotifyTimeDisplayMode } from "@/widgets/spotify/types";

type SpotifyData = {
  timeDisplayMode: SpotifyTimeDisplayMode;
  ambient: boolean;
};

type SpotifyState = {
  byInstance: Record<string, SpotifyData>;
  setTimeDisplayMode: (instanceId: string, mode: SpotifyTimeDisplayMode) => void;
  setAmbient: (instanceId: string, ambient: boolean) => void;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_DATA: SpotifyData = {
  timeDisplayMode: "total",
  ambient: true,
};

const configSchema = z.object({
  timeDisplayMode: z.enum(SPOTIFY_TIME_DISPLAY_MODES).default("total"),
  ambient: z.boolean().default(true),
});

const persistedSchema = z.object({
  byInstance: z.record(z.string(), configSchema),
});

const gatedStorage = createGatedChromeStorage();

function update(
  state: SpotifyState,
  instanceId: string,
  fn: (data: SpotifyData) => SpotifyData,
): Pick<SpotifyState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, fn) };
}

export const useSpotifyStore = create<SpotifyState>()(
  persist(
    (set) => ({
      byInstance: {},
      setTimeDisplayMode: (instanceId, timeDisplayMode) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, timeDisplayMode }))),
      setAmbient: (instanceId, ambient) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, ambient }))),
      removeInstance: (instanceId) =>
        set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) })),
    }),
    {
      name: "widget:spotify",
      storage: gatedStorage,
      version: 2,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({ byInstance: state.byInstance }),
      migrate: (persisted, version) => {
        if (version >= 2) return persisted;
        const legacy = configSchema.safeParse(persisted);
        return {
          byInstance: legacy.success
            ? { spotify: { timeDisplayMode: legacy.data.timeDisplayMode, ambient: legacy.data.ambient } }
            : {},
        };
      },
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        const byInstance: Record<string, SpotifyData> = {};
        for (const [id, config] of Object.entries(parsed.data.byInstance)) {
          byInstance[id] = { ...DEFAULT_DATA, ...config };
        }
        return { ...current, byInstance };
      },
    },
  ),
);

registerInstanceCleanup((instanceId) => useSpotifyStore.getState().removeInstance(instanceId));

export const useSpotify = createInstanceSelector(useSpotifyStore, DEFAULT_DATA);
