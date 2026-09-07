import { z } from "zod";
import { createPersistedStore } from "@/lib/storage";
import { tolerantRecord } from "@/lib/persist";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import { SPOTIFY_TIME_DISPLAY_MODES, type SpotifyTimeDisplayMode } from "@/widgets/spotify/types";

type SpotifyData = {
  timeDisplayMode: SpotifyTimeDisplayMode;
  queueView: boolean;
};

type SpotifyState = {
  byInstance: Record<string, SpotifyData>;
  setTimeDisplayMode: (instanceId: string, mode: SpotifyTimeDisplayMode) => void;
  setQueueView: (instanceId: string, queueView: boolean) => void;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_DATA: SpotifyData = {
  timeDisplayMode: "total",
  queueView: false,
};

const configSchema = z.object({
  timeDisplayMode: z.enum(SPOTIFY_TIME_DISPLAY_MODES).catch("total"),
  queueView: z.boolean().catch(false),
});

const legacySchema = z.object({
  timeDisplayMode: z.enum(SPOTIFY_TIME_DISPLAY_MODES),
});

const persistedSchema = z.object({ byInstance: tolerantRecord(configSchema) });

function update(
  state: SpotifyState,
  instanceId: string,
  fn: (data: SpotifyData) => SpotifyData,
): Pick<SpotifyState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, fn) };
}

export const useSpotifyStore = createPersistedStore<SpotifyState>()(
  (set) => ({
    byInstance: {},
    setTimeDisplayMode: (instanceId, timeDisplayMode) =>
      set((state) => update(state, instanceId, (data) => ({ ...data, timeDisplayMode }))),
    setQueueView: (instanceId, queueView) =>
      set((state) => update(state, instanceId, (data) => ({ ...data, queueView }))),
    removeInstance: (instanceId) =>
      set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) })),
  }),
  {
    name: "widget:spotify",
    version: 2,
    partialize: (state) => ({ byInstance: state.byInstance }),
    migrate: (persisted, version) => {
      if (version >= 2) return persisted;
      const legacy = legacySchema.safeParse(persisted);
      return {
        byInstance: legacy.success
          ? {
              spotify: {
                timeDisplayMode: legacy.data.timeDisplayMode,
              },
            }
          : {},
      };
    },
    schema: persistedSchema,
    build: (parsed, current) => ({
      ...current,
      byInstance: Object.fromEntries(
        Object.entries(parsed.byInstance).map(([id, config]) => [
          id,
          { ...DEFAULT_DATA, ...config },
        ]),
      ),
    }),
  },
);

export const useSpotify = createInstanceSelector(useSpotifyStore, DEFAULT_DATA);
