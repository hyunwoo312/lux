import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SpotifyStatus } from "@/widgets/spotify/SpotifyStatus";
import { useSpotifyStore } from "@/widgets/spotify/useSpotifyStore";

function renderStatus() {
  return render(
    <TooltipProvider>
      <SpotifyStatus />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  useSpotifyStore.setState({ nowPlayingTrackId: null, nowPlayingArtworkUrl: null });
});

describe("SpotifyStatus", () => {
  it("links to the current track on Spotify when one is playing", () => {
    useSpotifyStore.setState({ nowPlayingTrackId: "abc123" });
    renderStatus();
    const link = screen.getByRole("link", { name: "Open current track in Spotify" });
    expect(link).toHaveAttribute("href", "https://open.spotify.com/track/abc123");
  });

  it("shows a non-interactive marker when nothing is playing", () => {
    renderStatus();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByLabelText("No track playing")).toBeInTheDocument();
  });
});
