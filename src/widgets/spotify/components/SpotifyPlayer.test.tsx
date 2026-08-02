// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SpotifyPlayer } from "@/widgets/spotify/components/SpotifyPlayer";
import type { SpotifyPlaybackController } from "@/widgets/spotify/hooks/useSpotifyPlayback";
import type { SpotifyPlaybackState } from "@/widgets/spotify/types";

function playback(context: SpotifyPlaybackState["context"] = null): SpotifyPlaybackState {
  return {
    isPlaying: true,
    progressMs: 1000,
    shuffle: false,
    repeatMode: "off",
    context,
    device: { id: "d1", name: "Desk", type: "Computer", isActive: true, volumePercent: 50 },
    track: {
      id: "t1",
      title: "Lullaby",
      artist: "Artist",
      album: "Album",
      durationMs: 200_000,
    },
  };
}

function controller(contextName: string | null): SpotifyPlaybackController {
  return {
    playback: playback(),
    deviceOptions: [],
    isTrackLiked: false,
    contextName,
    pendingActions: new Set(),
    error: null,
    isLoading: false,
    displayedProgressMs: 1000,
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
    loadDevices: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
  };
}

function renderPlayer(contextName: string | null) {
  return render(
    <TooltipProvider>
      <SpotifyPlayer
        controller={controller(contextName)}
        playback={playback({ uri: "spotify:playlist:p1", kind: "playlist" })}
        view="expanded"
        timeDisplayMode="total"
      />
    </TooltipProvider>,
  );
}

describe("SpotifyPlayer context label", () => {
  it("shows what the track is playing from once the name resolves", () => {
    renderPlayer("Deep Focus");

    expect(screen.getByText("Album · from Deep Focus")).toBeInTheDocument();
  });

  it("shows the album alone when the context name is unresolved", () => {
    renderPlayer(null);

    expect(screen.getByText("Album")).toBeInTheDocument();
  });
});
