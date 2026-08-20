// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/spotify/lib/spotify-api", () => ({ skipSpotifyNext: vi.fn() }));
vi.mock("@/widgets/spotify/hooks/useSpotifyPlayback", async () => {
  const { create } = await import("zustand");
  const useSpotifyPlaybackStore = create(() => ({
    playback: null,
    queue: [] as unknown[],
    queueLoading: false,
    queueError: null,
  }));
  const { skipSpotifyNext } = await import("@/widgets/spotify/lib/spotify-api");
  return {
    useSpotifyPlaybackStore,
    loadSpotifyQueue: vi.fn(),
    requestSpotifyPlaybackRefresh: vi.fn(),
    skipSpotifyAhead: vi.fn(async (steps: number) => {
      for (let step = 0; step < steps; step += 1) await skipSpotifyNext();
    }),
  };
});

import { SpotifyQueuePanel } from "@/widgets/spotify/components/SpotifyQueuePanel";
import { useSpotifyPlaybackStore } from "@/widgets/spotify/hooks/useSpotifyPlayback";
import { skipSpotifyNext } from "@/widgets/spotify/lib/spotify-api";
import type { SpotifyQueueItem } from "@/widgets/spotify/types";

const skipMock = vi.mocked(skipSpotifyNext);

function queueOf(length: number): SpotifyQueueItem[] {
  return Array.from({ length }, (_, index) => ({
    id: `t${index + 1}`,
    uri: `spotify:track:${index + 1}`,
    title: `Track ${index + 1}`,
    subtitle: "Artist",
  }));
}

function seedQueue(items: SpotifyQueueItem[]) {
  useSpotifyPlaybackStore.setState({
    playback: null,
    queue: items,
    queueLoading: false,
    queueError: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  skipMock.mockResolvedValue(undefined);
});

describe("skipping to a queued track", () => {
  it("steps to a track within reach", async () => {
    seedQueue(queueOf(8));
    render(<SpotifyQueuePanel />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Track 3/ }));
    });

    await waitFor(() => expect(skipMock).toHaveBeenCalledTimes(3));
  });

  it("refuses a track deeper than the cap instead of hammering the API", () => {
    seedQueue(queueOf(20));
    render(<SpotifyQueuePanel />);

    fireEvent.click(screen.getByRole("button", { name: /Track 9/ }));

    expect(skipMock).not.toHaveBeenCalled();
    expect(screen.getByText(/too far down the queue/)).toBeInTheDocument();
  });
});
