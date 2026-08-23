// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpotifyControls } from "@/widgets/spotify/components/SpotifyControls";
import type { SpotifyPlaybackState } from "@/widgets/spotify/types";

const PLAYBACK: SpotifyPlaybackState = {
  isPlaying: true,
  progressMs: 0,
  shuffle: false,
  repeatMode: "off",
  device: { id: "d1", name: "Desk", type: "Computer", isActive: true, volumePercent: 50 },
  track: { id: "t1", title: "Song", artist: "Artist", album: "Album", durationMs: 1000 },
  context: null,
};

function renderControls(playback: SpotifyPlaybackState) {
  render(
    <SpotifyControls
      playback={playback}
      pendingActions={new Set()}
      canRestart={false}
      showSideControls={false}
      deviceOptions={[]}
      volumePercent={50}
      onTogglePlayback={vi.fn()}
      onPrevious={vi.fn()}
      onNext={vi.fn()}
      onToggleShuffle={vi.fn()}
      onCycleRepeat={vi.fn()}
      onTransferDevice={vi.fn()}
      onOpenDeviceMenu={vi.fn()}
      onChangeVolume={vi.fn()}
      onCommitVolume={vi.fn()}
    />,
  );
}

describe("SpotifyControls active states", () => {
  it("marks shuffle-on with a dot, since the accent alone is 1.01:1 against the off state", () => {
    renderControls({ ...PLAYBACK, shuffle: true });
    const button = screen.getByRole("button", { name: "Disable shuffle" });

    expect(button.querySelector("span.bg-primary")).not.toBeNull();
  });

  it("says which state each toggle is in, for anyone not seeing the fill", () => {
    renderControls({ ...PLAYBACK, shuffle: true });

    expect(screen.getByRole("button", { name: "Disable shuffle" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
