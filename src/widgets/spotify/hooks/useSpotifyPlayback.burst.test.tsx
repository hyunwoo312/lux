// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/spotify/lib/spotify-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/spotify/lib/spotify-api")>()),
  skipSpotifyNext: vi.fn(),
  skipSpotifyPrevious: vi.fn(),
  setSpotifyShuffle: vi.fn(),
  getSpotifyPlaybackState: vi.fn().mockResolvedValue(null),
  getSpotifyContextName: vi.fn().mockResolvedValue(null),
  getSpotifySavedTrackFlags: vi.fn().mockResolvedValue({}),
}));

import { skipSpotifyNext, setSpotifyShuffle } from "@/widgets/spotify/lib/spotify-api";
import { renderHook } from "@testing-library/react";
import {
  useSpotifyPlayback,
  useSpotifyPlaybackStore,
} from "@/widgets/spotify/hooks/useSpotifyPlayback";
import type { SpotifyPlaybackState } from "@/widgets/spotify/types";

const next = vi.mocked(skipSpotifyNext);
const shuffle = vi.mocked(setSpotifyShuffle);

const PLAYBACK: SpotifyPlaybackState = {
  isPlaying: true,
  progressMs: 1000,
  shuffle: false,
  repeatMode: "off",
  device: { id: "d1", name: "Desk", type: "Computer", isActive: true, volumePercent: 50 },
  track: {
    id: "t1",
    title: "Track",
    artist: "Artist",
    album: "Album",
    durationMs: 200000,
    artworkUrl: undefined,
  },
  context: null,
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function controller() {
  return renderHook(() => useSpotifyPlayback(false)).result.current;
}

beforeEach(() => {
  vi.clearAllMocks();
  useSpotifyPlaybackStore.setState({ playback: PLAYBACK, pendingActions: new Set(), error: null });
});

describe("burst input", () => {
  it("skips twice when next is pressed twice, rather than swallowing the second", async () => {
    let release!: () => void;
    next.mockImplementationOnce(() => new Promise<void>((done) => (release = done)));
    next.mockResolvedValue(undefined);

    const { nextTrack } = controller();
    nextTrack();
    nextTrack();
    await settle();

    expect(next).toHaveBeenCalledTimes(1);
    release();
    await settle();
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("runs every press of a burst, in order", async () => {
    const { nextTrack } = controller();
    nextTrack();
    nextTrack();
    nextTrack();
    await settle();

    expect(next).toHaveBeenCalledTimes(3);
  });

  it("lands a double shuffle press back where it started, with one request", async () => {
    let release!: () => void;
    shuffle.mockImplementationOnce(() => new Promise<void>((done) => (release = done)));
    shuffle.mockResolvedValue(undefined);

    const { toggleShuffle } = controller();
    toggleShuffle();
    expect(useSpotifyPlaybackStore.getState().playback?.shuffle).toBe(true);
    toggleShuffle();
    expect(useSpotifyPlaybackStore.getState().playback?.shuffle).toBe(false);

    await settle();
    release();
    await settle();

    expect(shuffle).toHaveBeenLastCalledWith(false);
  });

  it("shows the toggle immediately rather than after the round trip", () => {
    shuffle.mockImplementation(() => new Promise<void>(() => {}));

    controller().toggleShuffle();

    expect(useSpotifyPlaybackStore.getState().playback?.shuffle).toBe(true);
  });
});
