// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/widgets/spotify/lib/spotify-api", () => ({
  getSpotifyPlaybackState: vi.fn(),
  getSpotifyDevices: vi.fn().mockResolvedValue([]),
  pauseSpotifyPlayback: vi.fn(),
  resumeSpotifyPlayback: vi.fn(),
  skipSpotifyNext: vi.fn(),
  skipSpotifyPrevious: vi.fn(),
  seekSpotifyPlayback: vi.fn(),
  setSpotifyVolume: vi.fn(),
  setSpotifyShuffle: vi.fn(),
  setSpotifyRepeatMode: vi.fn(),
  transferSpotifyPlayback: vi.fn(),
}));

import { useIntegrationStore } from "@/integrations";
import { getSpotifyPlaybackState } from "@/widgets/spotify/lib/spotify-api";
import { SpotifyWidget } from "@/widgets/spotify/SpotifyWidget";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { useSpotifyPlaybackStore } from "@/widgets/spotify/hooks/useSpotifyPlayback";
import type { IntegrationAccountStatus } from "@/integrations/types";
import type { SpotifyPlaybackState } from "@/widgets/spotify/types";

const playbackMock = vi.mocked(getSpotifyPlaybackState);

function setAccount(status: IntegrationAccountStatus | null) {
  useIntegrationStore.setState({
    accounts: status
      ? [
          {
            id: "spotify-1",
            providerId: "spotify",
            providerAccountId: "1",
            displayName: "Ada",
            status,
            connectedAt: "2026-06-20T00:00:00.000Z",
          },
        ]
      : [],
    loaded: true,
  });
}

function playingState(): SpotifyPlaybackState {
  return {
    isPlaying: true,
    progressMs: 1000,
    shuffle: false,
    repeatMode: "off",
    device: { id: "dev1", name: "Desk", type: "Computer", isActive: true, volumePercent: 50 },
    track: {
      id: "t1",
      title: "Lullaby",
      artist: "Artist",
      album: "Album",
      durationMs: 200_000,
    },
  };
}

function renderWidget() {
  return render(
    <WidgetInstanceContext.Provider value="spotify-1">
      <SpotifyWidget />
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  playbackMock.mockReset();
  playbackMock.mockResolvedValue(null);
  useSpotifyPlaybackStore.setState({
    playback: null,
    devices: [],
    pendingActions: new Set(),
    volumeDraft: null,
    progressDraftMs: null,
    error: null,
    isLoading: true,
  });
});

describe("SpotifyWidget", () => {
  it("prompts to connect when no account exists", () => {
    setAccount(null);
    renderWidget();
    expect(screen.getByRole("button", { name: "Connect Spotify" })).toBeInTheDocument();
    expect(screen.getByText("Connect Spotify to see and control playback.")).toBeInTheDocument();
  });

  it("prompts to reconnect when the account needs reconnection", () => {
    setAccount("needsReconnect");
    renderWidget();
    expect(screen.getByText("Reconnect Spotify")).toBeInTheDocument();
  });

  it("renders the current track and transport controls when playing", async () => {
    setAccount("connected");
    playbackMock.mockResolvedValue(playingState());
    renderWidget();
    expect(await screen.findByText("Lullaby")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next track" })).toBeInTheDocument();
  });

  it("shows the nothing-playing state when connected with no playback", async () => {
    setAccount("connected");
    playbackMock.mockResolvedValue(null);
    renderWidget();
    expect(await screen.findByText("Nothing playing")).toBeInTheDocument();
  });
});