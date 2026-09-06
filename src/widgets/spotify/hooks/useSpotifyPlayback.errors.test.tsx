// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/spotify/lib/spotify-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/spotify/lib/spotify-api")>()),
  getSpotifyPlaybackState: vi.fn(),
  getSpotifyContextName: vi.fn().mockResolvedValue(null),
  getSpotifySavedTrackFlags: vi.fn().mockResolvedValue(new Set()),
}));

import { renderHook } from "@testing-library/react";
import { getSpotifyPlaybackState } from "@/widgets/spotify/lib/spotify-api";
import {
  useSpotifyPlayback,
  useSpotifyPlaybackStore,
} from "@/widgets/spotify/hooks/useSpotifyPlayback";

const state = vi.mocked(getSpotifyPlaybackState);

const HOUR_MS = 60 * 60_000;

let clock = Date.parse("2026-09-06T12:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  clock += HOUR_MS;
  vi.setSystemTime(clock);
  useSpotifyPlaybackStore.setState({ playback: null, pendingActions: new Set(), error: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("playback polling errors", () => {
  it("waits out the backoff before a manual refresh asks Spotify again", async () => {
    state.mockRejectedValue(new Error("Spotify is down"));
    const { refresh } = renderHook(() => useSpotifyPlayback(false)).result.current;

    await refresh();
    await refresh();

    expect(state).toHaveBeenCalledTimes(1);
  });

  it("keeps the last error on screen until the next poll settles", async () => {
    state.mockRejectedValueOnce(new Error("Spotify is down"));
    const { refresh } = renderHook(() => useSpotifyPlayback(false)).result.current;

    await refresh();
    expect(useSpotifyPlaybackStore.getState().error?.message).toBe("Spotify is down");

    let release!: (value: null) => void;
    state.mockImplementationOnce(() => new Promise((done) => (release = done)));
    vi.setSystemTime(clock + HOUR_MS);
    const pending = refresh();
    await vi.advanceTimersByTimeAsync(0);
    expect(useSpotifyPlaybackStore.getState().error?.message).toBe("Spotify is down");

    release(null);
    await pending;
    expect(useSpotifyPlaybackStore.getState().error).toBeNull();
  });
});
