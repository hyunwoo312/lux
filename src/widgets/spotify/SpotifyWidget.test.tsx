// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/spotify/lib/spotify-api", () => ({
  getSpotifyPlaybackState: vi.fn(),
  getSpotifyDevices: vi.fn().mockResolvedValue([]),
  getSpotifySavedTrackFlags: vi.fn().mockResolvedValue(new Set<string>()),
  getSpotifyContextName: vi.fn().mockResolvedValue(null),
  SpotifyRequestError: class SpotifyRequestError extends Error {},
  pauseSpotifyPlayback: vi.fn(),
  resumeSpotifyPlayback: vi.fn(),
  skipSpotifyNext: vi.fn(),
  skipSpotifyPrevious: vi.fn(),
  seekSpotifyPlayback: vi.fn(),
  setSpotifyVolume: vi.fn(),
  setSpotifyShuffle: vi.fn(),
  setSpotifyRepeatMode: vi.fn(),
  transferSpotifyPlayback: vi.fn(),
  getMySpotifyPlaylists: vi.fn().mockResolvedValue([]),
  startSpotifyPlayback: vi.fn(),
  getSpotifyQueue: vi.fn().mockResolvedValue([]),
  addSpotifyToQueue: vi.fn(),
  searchSpotify: vi.fn().mockResolvedValue([]),
}));

import { useIntegrationStore } from "@/integrations";
import {
  getSpotifyContextName,
  getSpotifyPlaybackState,
  getSpotifySavedTrackFlags,
} from "@/widgets/spotify/lib/spotify-api";
import { SpotifyWidget } from "@/widgets/spotify/SpotifyWidget";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import {
  requestSpotifyPlaybackRefresh,
  useSpotifyPlaybackStore,
} from "@/widgets/spotify/hooks/useSpotifyPlayback";
import type { IntegrationAccountStatus } from "@/integrations/types";
import type { SpotifyPlaybackState } from "@/widgets/spotify/types";

const playbackMock = vi.mocked(getSpotifyPlaybackState);
const savedFlagsMock = vi.mocked(getSpotifySavedTrackFlags);
const contextNameMock = vi.mocked(getSpotifyContextName);

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
    context: null,
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
  savedFlagsMock.mockReset();
  savedFlagsMock.mockResolvedValue(new Set<string>());
  contextNameMock.mockReset();
  contextNameMock.mockResolvedValue(null);
  useSpotifyPlaybackStore.setState({
    playback: null,
    devices: [],
    devicesLoading: false,
    devicesError: null,
    pendingActions: new Set(),
    volumeDraft: null,
    progressDraftMs: null,
    likedTrack: null,
    contextLabel: null,
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

  it("checks the saved state once per track, not on every poll", async () => {
    setAccount("connected");
    playbackMock.mockResolvedValue(playingState());
    savedFlagsMock.mockResolvedValue(new Set<string>());
    renderWidget();

    await screen.findByText("Lullaby");
    await waitFor(() => expect(savedFlagsMock).toHaveBeenCalledTimes(1));

    requestSpotifyPlaybackRefresh();
    await waitFor(() => expect(playbackMock.mock.calls.length).toBeGreaterThan(1));

    expect(savedFlagsMock).toHaveBeenCalledTimes(1);
  });

  it("explains an empty device list instead of showing an empty menu", async () => {
    setAccount("connected");
    renderWidget();

    await screen.findByText("Nothing playing");
    fireEvent.click(screen.getByRole("button", { name: "Choose playback device" }));

    expect(await screen.findByText("Open Spotify on a device to see it here.")).toBeInTheDocument();
  });
});
