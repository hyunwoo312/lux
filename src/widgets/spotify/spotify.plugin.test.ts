// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("@/widgets/spotify/lib/spotify-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/spotify/lib/spotify-api")>()),
  getSpotifyPlaybackState: vi.fn(),
  setSpotifyShuffle: vi.fn(),
  searchSpotify: vi.fn(),
  getSpotifyDevices: vi.fn(),
  startSpotifyPlayback: vi.fn(),
  setSpotifyVolume: vi.fn(),
  transferSpotifyPlayback: vi.fn(),
  getMySpotifyPlaylists: vi.fn(),
  getMySpotifyAlbums: vi.fn(),
  getMySpotifyLikedTracks: vi.fn(),
}));

import {
  getSpotifyPlaybackState,
  getMySpotifyPlaylists,
  getMySpotifyAlbums,
  getMySpotifyLikedTracks,
  getSpotifyDevices,
  searchSpotify,
  setSpotifyShuffle,
  setSpotifyVolume,
  startSpotifyPlayback,
  transferSpotifyPlayback,
} from "@/widgets/spotify/lib/spotify-api";
import { spotifyPlugin } from "@/widgets/spotify";
import { useSpotifyPlaybackStore } from "@/widgets/spotify/hooks/useSpotifyPlayback";
import type { SpotifyPlaybackState } from "@/widgets/spotify/types";

const playbackState = (shuffle: boolean) =>
  ({
    isPlaying: true,
    shuffle,
    repeatMode: "off",
    progressMs: 0,
    track: {
      id: "t1",
      name: "Track",
      artists: "Artist",
      durationMs: 1000,
      url: "",
      artworkUrl: "",
    },
    device: { id: "d1", name: "Device", volumePercent: 50, isActive: true },
    context: null,
  }) as unknown as SpotifyPlaybackState;

const command = (id: string) => spotifyPlugin.commands?.().find((entry) => entry.id === id);

const action = (id: string) => {
  const found = command(id);
  if (found?.kind !== "action") throw new Error(`${id} is not an action`);
  return found;
};

const provider = (id: string) => {
  const found = command(id);
  if (found?.kind !== "provider") throw new Error(`${id} is not a provider`);
  return found;
};

beforeEach(() => {
  vi.clearAllMocks();
  useSpotifyPlaybackStore.setState({ playback: null, devices: [] });
});

it("loads playback before acting when no widget has warmed it", async () => {
  vi.mocked(getSpotifyPlaybackState).mockResolvedValue(playbackState(false));

  await action("spotify.shuffle").run();

  expect(getSpotifyPlaybackState).toHaveBeenCalled();
  expect(setSpotifyShuffle).toHaveBeenCalledWith(true);
});

it("does not refetch when a widget already holds playback", async () => {
  useSpotifyPlaybackStore.setState({ playback: playbackState(true) });

  await action("spotify.shuffle").run();

  expect(getSpotifyPlaybackState).not.toHaveBeenCalled();
  expect(setSpotifyShuffle).toHaveBeenCalledWith(false);
});

it("turns a provider's results into rows that play what you pick", async () => {
  vi.mocked(searchSpotify).mockResolvedValue([
    {
      id: "t1",
      uri: "spotify:track:t1",
      kind: "track",
      title: "Despacito",
      subtitle: "Luis Fonsi",
      artworkUrl: "art.png",
    },
  ]);

  const rows = await provider("spotify.search").search("despacito", new AbortController().signal);

  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ label: "Despacito", section: "Songs" });

  useSpotifyPlaybackStore.setState({
    devices: [{ id: "d1", name: "Desk", type: "Computer", isActive: true, volumePercent: 50 }],
  });

  await rows[0]?.run();
  expect(startSpotifyPlayback).toHaveBeenCalledWith(
    expect.objectContaining({ uri: "spotify:track:t1" }),
    "d1",
  );
});

it("refuses to play when no device is available, instead of failing silently", async () => {
  vi.mocked(searchSpotify).mockResolvedValue([
    {
      id: "t1",
      uri: "spotify:track:t1",
      kind: "track",
      title: "Despacito",
      subtitle: "Luis Fonsi",
    },
  ]);
  useSpotifyPlaybackStore.setState({ devices: [] });
  vi.mocked(getSpotifyDevices).mockResolvedValue([]);

  const rows = await provider("spotify.search").search("despacito", new AbortController().signal);

  await expect(rows[0]?.run()).rejects.toThrow(/device/i);
  expect(startSpotifyPlayback).not.toHaveBeenCalled();
});

it("nudges the volume relative to what the device is already at", async () => {
  useSpotifyPlaybackStore.setState({ playback: playbackState(false) });

  await action("spotify.volumeUp").run();

  expect(setSpotifyVolume).toHaveBeenCalledWith(60);
});

it("clamps a nudge at full volume rather than overshooting", async () => {
  const state = playbackState(false);
  useSpotifyPlaybackStore.setState({
    playback: { ...state, device: { ...state.device, volumePercent: 95 } },
  });

  await action("spotify.volumeUp").run();

  expect(setSpotifyVolume).toHaveBeenCalledWith(100);
});

it("moves playback to the device picked from the list", async () => {
  useSpotifyPlaybackStore.setState({ playback: playbackState(false) });
  vi.mocked(getSpotifyDevices).mockResolvedValue([
    { id: "d2", name: "Kitchen", type: "Speaker", isActive: false, volumePercent: 40 },
    { id: "d3", name: "Office", type: "Computer", isActive: false, volumePercent: 20 },
  ]);

  const rows = await provider("spotify.device").search("kitc", new AbortController().signal);

  expect(rows).toHaveLength(1);
  await rows[0]?.run();
  expect(transferSpotifyPlayback).toHaveBeenCalledWith("d2");
});

it("says what to do instead of failing silently when Spotify is open nowhere", async () => {
  vi.mocked(getSpotifyPlaybackState).mockResolvedValue(null);
  vi.mocked(getSpotifyDevices).mockResolvedValue([]);

  await expect(action("spotify.volume50").run()).rejects.toThrow(/open spotify on a device/i);
  expect(setSpotifyVolume).not.toHaveBeenCalled();
});

it("offers your own playlists before you have typed anything", async () => {
  vi.mocked(getMySpotifyPlaylists).mockResolvedValue([
    {
      id: "p1",
      uri: "spotify:playlist:p1",
      kind: "playlist",
      title: "Focus",
      subtitle: "12 tracks",
    },
  ]);

  const rows = await provider("spotify.search").search("", new AbortController().signal);

  expect(searchSpotify).not.toHaveBeenCalled();
  expect(rows).toMatchObject([{ label: "Focus" }]);
});

it("wakes an idle device instead of refusing to act", async () => {
  vi.mocked(getSpotifyPlaybackState)
    .mockResolvedValueOnce(null)
    .mockResolvedValue(playbackState(false));
  vi.mocked(getSpotifyDevices).mockResolvedValue([
    { id: "d9", name: "Kitchen", type: "Speaker", isActive: false, volumePercent: 30 },
  ]);

  await action("spotify.next").run();

  expect(transferSpotifyPlayback).toHaveBeenCalledWith("d9");
});

it("files each result under the section for its kind", async () => {
  vi.mocked(searchSpotify).mockResolvedValue([
    { id: "t1", uri: "spotify:track:t1", kind: "track", title: "Song", subtitle: "Artist" },
    { id: "a1", uri: "spotify:album:a1", kind: "album", title: "Record", subtitle: "Artist" },
    { id: "p1", uri: "spotify:playlist:p1", kind: "playlist", title: "Mix", subtitle: "42 tracks" },
  ]);

  const rows = await provider("spotify.search").search("x", new AbortController().signal);

  expect(rows.map((row) => row.section)).toEqual(["Songs", "Albums", "Playlists"]);
});

it("asks Spotify for one kind at a time when the scope is specific", async () => {
  vi.mocked(searchSpotify).mockResolvedValue([]);
  const signal = new AbortController().signal;

  await provider("spotify.search.album").search("daft", signal);

  expect(searchSpotify).toHaveBeenCalledWith("daft", signal, "album");
});

it("spends no request on a specific scope until something is typed", async () => {
  await provider("spotify.search.track").search("", new AbortController().signal);

  expect(searchSpotify).not.toHaveBeenCalled();
  expect(getMySpotifyPlaylists).not.toHaveBeenCalled();
});

const saved = (id: string, title: string, kind: "track" | "album" | "playlist") => ({
  id,
  uri: `spotify:${kind}:${id}`,
  kind,
  title,
  subtitle: "Someone",
});

it("opens the library on everything you have saved, filed by kind", async () => {
  vi.mocked(getMySpotifyPlaylists).mockResolvedValue([saved("p1", "Focus", "playlist")]);
  vi.mocked(getMySpotifyAlbums).mockResolvedValue([saved("a1", "Discovery", "album")]);
  vi.mocked(getMySpotifyLikedTracks).mockResolvedValue([saved("t1", "One More Time", "track")]);

  const rows = await provider("spotify.library").search("", new AbortController().signal);

  expect(rows.map((row) => row.section)).toEqual(["Playlists", "Albums", "Liked songs"]);
});

it("searches across the library rather than only one kind of thing", async () => {
  vi.mocked(getMySpotifyPlaylists).mockResolvedValue([saved("p1", "Focus", "playlist")]);
  vi.mocked(getMySpotifyAlbums).mockResolvedValue([saved("a1", "Discovery", "album")]);
  vi.mocked(getMySpotifyLikedTracks).mockResolvedValue([saved("t1", "One More Time", "track")]);

  const rows = await provider("spotify.library").search("disc", new AbortController().signal);

  expect(rows.map((row) => row.label)).toEqual(["Discovery"]);
});
