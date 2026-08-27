// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/spotify/lib/spotify-api", () => ({
  getSpotifyDevices: vi.fn(),
  getMySpotifyPlaylists: vi.fn().mockResolvedValue([]),
  searchSpotify: vi.fn(),
  getSpotifySavedTrackFlags: vi.fn(),
  startSpotifyPlayback: vi.fn().mockResolvedValue(undefined),
  addSpotifyToQueue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/widgets/spotify/hooks/useSpotifyPlayback", () => ({
  loadSpotifyQueue: vi.fn(),
  requestSpotifyPlaybackRefresh: vi.fn(),
}));

import { TooltipProvider } from "@/components/ui/tooltip";
import { SpotifySearch } from "@/widgets/spotify/SpotifySearch";
import { requestSpotifyPlaybackRefresh } from "@/widgets/spotify/hooks/useSpotifyPlayback";
import {
  addSpotifyToQueue,
  getSpotifyDevices,
  getSpotifySavedTrackFlags,
  searchSpotify,
  startSpotifyPlayback,
} from "@/widgets/spotify/lib/spotify-api";
import type { SpotifyPlaybackDevice, SpotifySearchResult } from "@/widgets/spotify/types";

const devicesMock = vi.mocked(getSpotifyDevices);
const searchMock = vi.mocked(searchSpotify);
const playMock = vi.mocked(startSpotifyPlayback);
const queueMock = vi.mocked(addSpotifyToQueue);
const flagsMock = vi.mocked(getSpotifySavedTrackFlags);
const refreshMock = vi.mocked(requestSpotifyPlaybackRefresh);

function device(id: string, name: string, isActive: boolean): SpotifyPlaybackDevice {
  return { id, name, type: "Computer", isActive, volumePercent: 50 };
}

const TRACK: SpotifySearchResult = {
  id: "t1",
  kind: "track",
  uri: "spotify:track:t1",
  title: "Lullaby",
  subtitle: "Artist",
};

const SECOND_TRACK: SpotifySearchResult = {
  id: "t2",
  kind: "track",
  uri: "spotify:track:t2",
  title: "Nocturne",
  subtitle: "Artist",
};

function renderSearch() {
  return render(
    <TooltipProvider>
      <SpotifySearch />
    </TooltipProvider>,
  );
}

async function openAndSearch() {
  fireEvent.click(screen.getByRole("button", { name: "Search Spotify" }));
  const input = await screen.findByRole("combobox", { name: "Search Spotify" });
  fireEvent.change(input, { target: { value: "lullaby" } });
  await waitFor(() => expect(screen.getByText("Lullaby")).toBeInTheDocument(), { timeout: 3000 });
}

beforeEach(() => {
  vi.clearAllMocks();
  searchMock.mockResolvedValue([TRACK]);
  playMock.mockResolvedValue(undefined);
  queueMock.mockResolvedValue(undefined);
  flagsMock.mockResolvedValue(new Set<string>());
});

describe("SpotifySearch device targeting", () => {
  it("plays on the active device when there is one", async () => {
    devicesMock.mockResolvedValue([device("d1", "Desk", true), device("d2", "Phone", false)]);
    renderSearch();
    await openAndSearch();

    fireEvent.click(screen.getByText("Lullaby"));

    await waitFor(() => expect(playMock).toHaveBeenCalledWith(TRACK, "d1"));
  });

  it("refreshes playback as soon as a result is played", async () => {
    devicesMock.mockResolvedValue([device("d1", "Desk", false)]);
    renderSearch();
    await openAndSearch();

    fireEvent.click(screen.getByText("Lullaby"));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("plays on a device the user picks when none is active", async () => {
    devicesMock.mockResolvedValue([device("d1", "Desk", false), device("d2", "Phone", false)]);
    renderSearch();
    await openAndSearch();

    fireEvent.click(screen.getByRole("button", { name: "Phone" }));
    fireEvent.click(screen.getByText("Lullaby"));

    await waitFor(() => expect(playMock).toHaveBeenCalledWith(TRACK, "d2"));
  });

  it("uses the only device without asking when exactly one is available", async () => {
    devicesMock.mockResolvedValue([device("d1", "Desk", false)]);
    renderSearch();
    await openAndSearch();

    expect(screen.queryByText("Play on")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Lullaby"));

    await waitFor(() => expect(playMock).toHaveBeenCalledWith(TRACK, "d1"));
  });

  it("queues to the chosen device too", async () => {
    devicesMock.mockResolvedValue([device("d1", "Desk", false), device("d2", "Phone", false)]);
    renderSearch();
    await openAndSearch();

    fireEvent.click(screen.getByRole("button", { name: "Phone" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to queue" }));

    await waitFor(() => expect(queueMock).toHaveBeenCalledWith(TRACK.uri, "d2"));
  });

  it("clears a failed search message when the query is cleared", async () => {
    devicesMock.mockResolvedValue([device("d1", "Desk", true)]);
    searchMock.mockRejectedValue(new Error("boom"));
    renderSearch();

    fireEvent.click(screen.getByRole("button", { name: "Search Spotify" }));
    const input = await screen.findByRole("combobox", { name: "Search Spotify" });
    fireEvent.change(input, { target: { value: "lullaby" } });
    await screen.findByText("Couldn't search Spotify.", undefined, { timeout: 3000 });

    fireEvent.change(input, { target: { value: "" } });

    await waitFor(() =>
      expect(screen.queryByText("Couldn't search Spotify.")).not.toBeInTheDocument(),
    );
  });

  it("renders results before liked flags resolve, then marks them without reordering", async () => {
    devicesMock.mockResolvedValue([device("d1", "Desk", true)]);
    let resolveFlags: (liked: Set<string>) => void = () => {};
    flagsMock.mockImplementation(
      () =>
        new Promise<Set<string>>((resolve) => {
          resolveFlags = resolve;
        }),
    );
    searchMock.mockResolvedValue([TRACK, SECOND_TRACK]);
    renderSearch();
    await openAndSearch();

    const before = screen.getAllByRole("option").map((row) => row.textContent);
    expect(before[0]).toContain("Lullaby");

    resolveFlags(new Set(["t2"]));

    await waitFor(() =>
      expect(screen.getAllByRole("option")[1]?.querySelector("svg.fill-current")).toBeTruthy(),
    );
    const after = screen.getAllByRole("option").map((row) => row.textContent);
    expect(after).toEqual(before);
  });
});
