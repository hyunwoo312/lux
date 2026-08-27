// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/spotify/lib/spotify-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/spotify/lib/spotify-api")>()),
  skipSpotifyNext: vi.fn(),
  skipSpotifyPrevious: vi.fn(),
  setSpotifyShuffle: vi.fn(),
  seekSpotifyPlayback: vi.fn(),
  getSpotifyPlaybackState: vi.fn().mockResolvedValue(null),
  getSpotifyContextName: vi.fn().mockResolvedValue(null),
  getSpotifySavedTrackFlags: vi.fn().mockResolvedValue({}),
}));

import {
  getSpotifyPlaybackState,
  seekSpotifyPlayback,
  setSpotifyShuffle,
  skipSpotifyNext,
} from "@/widgets/spotify/lib/spotify-api";
import { renderHook } from "@testing-library/react";
import {
  useSpotifyPlayback,
  useSpotifyPlaybackStore,
} from "@/widgets/spotify/hooks/useSpotifyPlayback";
import type { SpotifyPlaybackState } from "@/widgets/spotify/types";

const next = vi.mocked(skipSpotifyNext);
const shuffle = vi.mocked(setSpotifyShuffle);
const seek = vi.mocked(seekSpotifyPlayback);
const state = vi.mocked(getSpotifyPlaybackState);

const FOLLOW_UP_DELAY_COUNT = 4;

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

  it("sends a second seek issued during the first, rather than dropping it", async () => {
    let release!: () => void;
    seek.mockImplementationOnce(() => new Promise<void>((done) => (release = done)));
    seek.mockResolvedValue(undefined);

    const { changeProgress, commitProgress } = controller();
    changeProgress(5000);
    commitProgress();
    await settle();
    changeProgress(9000);
    commitProgress();
    await settle();

    expect(seek).toHaveBeenCalledTimes(1);
    release();
    await settle();
    expect(seek).toHaveBeenLastCalledWith(9000);
  });

  it("does not multiply the follow-up polls across a burst of skips", async () => {
    vi.useFakeTimers();
    const { nextTrack } = controller();
    nextTrack();
    nextTrack();
    nextTrack();
    await vi.advanceTimersByTimeAsync(0);
    const before = state.mock.calls.length;
    await vi.advanceTimersByTimeAsync(6000);
    vi.useRealTimers();

    expect(state.mock.calls.length - before).toBe(FOLLOW_UP_DELAY_COUNT);
  });
});
