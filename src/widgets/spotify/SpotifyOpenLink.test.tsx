import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SpotifyOpenLink } from "@/widgets/spotify/SpotifyOpenLink";
import { useSpotifyPlaybackStore } from "@/widgets/spotify/hooks/useSpotifyPlayback";
import type { SpotifyPlaybackState } from "@/widgets/spotify/types";

function playbackWithTrack(trackId: string): SpotifyPlaybackState {
  return {
    isPlaying: true,
    progressMs: 0,
    shuffle: false,
    repeatMode: "off",
    device: { id: "dev1", name: "Desk", type: "Computer", isActive: true, volumePercent: 50 },
    track: { id: trackId, title: "Lullaby", artist: "Artist", album: "Album", durationMs: 200_000 },
  };
}

function renderLink() {
  return render(
    <TooltipProvider>
      <SpotifyOpenLink />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  useSpotifyPlaybackStore.setState({ playback: null });
});

describe("SpotifyOpenLink", () => {
  it("links to the current track on Spotify when one is playing", () => {
    useSpotifyPlaybackStore.setState({ playback: playbackWithTrack("abc123") });
    renderLink();
    const link = screen.getByRole("link", { name: "Open current track in Spotify" });
    expect(link).toHaveAttribute("href", "https://open.spotify.com/track/abc123");
  });

  it("renders nothing when no track is playing", () => {
    const { container } = renderLink();
    expect(container).toBeEmptyDOMElement();
  });
});
