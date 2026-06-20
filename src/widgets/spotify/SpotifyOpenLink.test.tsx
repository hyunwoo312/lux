import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SpotifyOpenLink } from "@/widgets/spotify/SpotifyOpenLink";
import { useSpotifyStore } from "@/widgets/spotify/useSpotifyStore";

function renderLink() {
  return render(
    <TooltipProvider>
      <SpotifyOpenLink />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  useSpotifyStore.setState({ nowPlayingTrackId: null, nowPlayingArtworkUrl: null });
});

describe("SpotifyOpenLink", () => {
  it("links to the current track on Spotify when one is playing", () => {
    useSpotifyStore.setState({ nowPlayingTrackId: "abc123" });
    renderLink();
    const link = screen.getByRole("link", { name: "Open current track in Spotify" });
    expect(link).toHaveAttribute("href", "https://open.spotify.com/track/abc123");
  });

  it("renders nothing when no track is playing", () => {
    const { container } = renderLink();
    expect(container).toBeEmptyDOMElement();
  });
});
