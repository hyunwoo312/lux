// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/spotify/lib/spotify-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/spotify/lib/spotify-api")>()),
  pauseSpotifyPlayback: vi.fn().mockResolvedValue(undefined),
  resumeSpotifyPlayback: vi.fn().mockResolvedValue(undefined),
  getSpotifyPlaybackState: vi.fn().mockResolvedValue(null),
  getSpotifyContextName: vi.fn().mockResolvedValue(null),
  getSpotifySavedTrackFlags: vi.fn().mockResolvedValue({}),
}));

import { act, renderHook } from "@testing-library/react";
import {
  useSpotifyPlayback,
  useSpotifyPlaybackStore,
} from "@/widgets/spotify/hooks/useSpotifyPlayback";
import type { SpotifyPlaybackState } from "@/widgets/spotify/types";

const SYNCED_AT = 1_000_000;
const SINCE_LAST_POLL_MS = 7_000;

const PLAYBACK: SpotifyPlaybackState = {
  isPlaying: true,
  progressMs: 30_000,
  shuffle: false,
  repeatMode: "off",
  device: { id: "d1", name: "Desk", type: "Computer", isActive: true, volumePercent: 50 },
  track: {
    id: "t1",
    title: "Track",
    artist: "Artist",
    album: "Album",
    durationMs: 200_000,
    artworkUrl: undefined,
  },
  context: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  useSpotifyPlaybackStore.setState({
    playback: PLAYBACK,
    playbackSyncedAt: SYNCED_AT,
    nowMs: SYNCED_AT + SINCE_LAST_POLL_MS,
    progressDraftMs: null,
    pendingActions: new Set(),
    error: null,
  });
});

describe("the progress bar across a pause", () => {
  it("holds its position instead of rewinding to the last poll", () => {
    const { result } = renderHook(() => useSpotifyPlayback(false));

    const playing = result.current.displayedProgressMs;
    expect(playing).toBe(PLAYBACK.progressMs + SINCE_LAST_POLL_MS);

    act(() => result.current.togglePlayback());

    expect(result.current.displayedProgressMs).toBe(playing);
  });
});
