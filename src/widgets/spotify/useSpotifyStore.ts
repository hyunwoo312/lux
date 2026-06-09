import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { SPOTIFY_TIME_DISPLAY_MODES, type SpotifyTimeDisplayMode } from "@/widgets/spotify/types";

type SpotifyState = {
  timeDisplayMode: SpotifyTimeDisplayMode;
  ambient: boolean;
  nowPlayingTrackId: string | null;
  nowPlayingArtworkUrl: string | null;
  refreshNonce: number;
  setTimeDisplayMode: (mode: SpotifyTimeDisplayMode) => void;
  setAmbient: (ambient: boolean) => void;
  setNowPlaying: (trackId: string | null, artworkUrl: string | null) => void;
  requestRefresh: () => void;
};

const persistedSchema = z.object({
  timeDisplayMode: z.enum(SPOTIFY_TIME_DISPLAY_MODES).default("total"),
  ambient: z.boolean().default(true),
});

const gatedStorage = createGatedChromeStorage();

export const useSpotifyStore = create<SpotifyState>()(
  persist(
    (set) => ({
      timeDisplayMode: "total",
      ambient: true,
      nowPlayingTrackId: null,
      nowPlayingArtworkUrl: null,
      refreshNonce: 0,
      setTimeDisplayMode: (timeDisplayMode) => set({ timeDisplayMode }),
      setAmbient: (ambient) => set({ ambient }),
      setNowPlaying: (nowPlayingTrackId, nowPlayingArtworkUrl) =>
        set((state) =>
          state.nowPlayingTrackId === nowPlayingTrackId &&
          state.nowPlayingArtworkUrl === nowPlayingArtworkUrl
            ? state
            : { nowPlayingTrackId, nowPlayingArtworkUrl },
        ),
      requestRefresh: () => set((state) => ({ refreshNonce: state.refreshNonce + 1 })),
    }),
    {
      name: "widget:spotify",
      storage: gatedStorage,
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({ timeDisplayMode: state.timeDisplayMode, ambient: state.ambient }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return { ...current, ...parsed.data };
      },
    },
  ),
);
