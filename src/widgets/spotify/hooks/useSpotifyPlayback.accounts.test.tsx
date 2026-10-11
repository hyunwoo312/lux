// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useIntegrationStore } from "@/integrations";
import { getSpotifyPlaybackState, getSpotifyQueue } from "@/widgets/spotify/lib/spotify-api";
import {
  loadSpotifyQueue,
  useSpotifyPlayback,
  useSpotifyPlaybackStore,
} from "@/widgets/spotify/hooks/useSpotifyPlayback";
import type { SpotifyPlaybackState, SpotifyQueueItem } from "@/widgets/spotify/types";

vi.mock("@/widgets/spotify/lib/spotify-api", async (original) => ({
  ...(await original<typeof import("@/widgets/spotify/lib/spotify-api")>()),
  getSpotifyPlaybackState: vi.fn(),
  getSpotifyQueue: vi.fn(),
  getSpotifySavedTrackFlags: vi.fn().mockResolvedValue(new Set()),
  getSpotifyContextName: vi.fn().mockResolvedValue(null),
}));

const account = (id: string) => ({
  id,
  providerId: "spotify" as const,
  status: "connected" as const,
  providerAccountId: id,
  displayName: id,
  connectedAt: "2026-10-11T00:00:00Z",
});
const playback = (id: string): SpotifyPlaybackState => ({
  isPlaying: false,
  progressMs: 0,
  shuffle: false,
  repeatMode: "off",
  context: null,
  device: { id, name: id, type: "Computer", isActive: true, volumePercent: 50 },
  track: { id, title: id, artist: id, album: id, durationMs: 200000 },
});

afterEach(() => {
  act(() => useIntegrationStore.setState({ accounts: [] }));
  vi.clearAllMocks();
});

it("ignores playback that completes after a replacement account has loaded", async () => {
  let finish!: (value: SpotifyPlaybackState) => void;
  vi.mocked(getSpotifyPlaybackState)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    )
    .mockResolvedValue(playback("Bob"));
  useIntegrationStore.setState({ loaded: true, accounts: [account("Alice")] });
  const { result, rerender } = renderHook(({ id }) => useSpotifyPlayback(true, id), {
    initialProps: { id: "Alice" },
  });
  await waitFor(() => expect(getSpotifyPlaybackState).toHaveBeenCalledTimes(1));
  act(() => {
    useIntegrationStore.setState({ accounts: [account("Bob")] });
    rerender({ id: "Bob" });
  });
  await waitFor(() => expect(result.current.playback?.track.title).toBe("Bob"));
  await act(async () => finish(playback("Alice")));
  expect(result.current.playback?.track.title).toBe("Bob");
});

it("clears the previous queue and devices and ignores their late queue response", async () => {
  vi.mocked(getSpotifyPlaybackState).mockResolvedValue(playback("Alice"));
  useIntegrationStore.setState({ loaded: true, accounts: [account("Alice")] });
  const { rerender } = renderHook(({ id }) => useSpotifyPlayback(true, id), {
    initialProps: { id: "Alice" },
  });
  await waitFor(() =>
    expect(useSpotifyPlaybackStore.getState().playback?.track.title).toBe("Alice"),
  );
  let finish!: (value: SpotifyQueueItem[]) => void;
  vi.mocked(getSpotifyQueue).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  let pending!: Promise<void>;
  act(() => {
    useSpotifyPlaybackStore.setState({ devices: [playback("Alice").device] });
    pending = loadSpotifyQueue();
  });
  vi.mocked(getSpotifyPlaybackState).mockResolvedValue(playback("Bob"));
  act(() => {
    useIntegrationStore.setState({ accounts: [account("Bob")] });
    rerender({ id: "Bob" });
  });
  await act(async () => {
    finish([{ id: "Alice", uri: "spotify:track:Alice", title: "Alice", subtitle: "Alice" }]);
    await pending;
  });
  expect(useSpotifyPlaybackStore.getState().queue).toEqual([]);
  expect(useSpotifyPlaybackStore.getState().devices).toEqual([]);
});
