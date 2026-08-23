// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpotifyBar } from "@/widgets/spotify/components/SpotifyBar";
import type { SpotifyPlaybackController } from "@/widgets/spotify/hooks/useSpotifyPlayback";
import type { SpotifyPlaybackState } from "@/widgets/spotify/types";

const PLAYBACK: SpotifyPlaybackState = {
  isPlaying: true,
  progressMs: 30000,
  shuffle: false,
  repeatMode: "off",
  device: { id: "d1", name: "Desk", type: "Computer", isActive: true, volumePercent: 50 },
  track: {
    id: "t1",
    title: "Song",
    artist: "Artist",
    album: "Album",
    durationMs: 200000,
    artworkUrl: "https://i.scdn.co/image/cover.jpg",
  },
  context: null,
};

const CONTROLLER = {
  playback: PLAYBACK,
  deviceOptions: [],
  isTrackLiked: false,
  contextName: null,
  pendingActions: new Set(),
  error: null,
  isLoading: false,
  displayedProgressMs: 30000,
  volumePercent: 50,
  restartThresholdMs: 3000,
  togglePlayback: vi.fn(),
  previousTrack: vi.fn(),
  nextTrack: vi.fn(),
  toggleShuffle: vi.fn(),
  cycleRepeat: vi.fn(),
  changeVolume: vi.fn(),
  commitVolume: vi.fn(),
  changeProgress: vi.fn(),
  commitProgress: vi.fn(),
  transferDevice: vi.fn(),
  loadDevices: vi.fn(),
  refresh: vi.fn(),
} as unknown as SpotifyPlaybackController;

function renderBar(size: { width: number; height: number }) {
  render(
    <SpotifyBar
      controller={CONTROLLER}
      playback={PLAYBACK}
      timeDisplayMode="total"
      roomy={size.width >= 320}
      size={size}
    />,
  );
  return screen.getByRole("img", { name: /Album cover/ }) as HTMLImageElement;
}

describe("SpotifyBar artwork sizing", () => {
  it("keeps the cover square whichever limit applies", () => {
    const art = renderBar({ width: 400, height: 240 });

    expect(art.style.width).toBe(art.style.height);
  });

  it("keeps the cover from collapsing in a narrow bar", () => {
    const art = renderBar({ width: 120, height: 150 });

    expect(Number.parseInt(art.style.width, 10)).toBeGreaterThanOrEqual(64);
  });
});
