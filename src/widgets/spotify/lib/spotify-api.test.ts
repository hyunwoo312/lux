import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations", () => ({ integrationFetch: vi.fn() }));

import { integrationFetch } from "@/integrations";
import {
  getMySpotifyPlaylists,
  getSpotifyDevices,
  getSpotifyPlaybackState,
  getSpotifySavedTrackFlags,
  searchSpotify,
  seekSpotifyPlayback,
  setSpotifyRepeatMode,
  setSpotifyShuffle,
  setSpotifyVolume,
  skipSpotifyNext,
  SpotifyRateLimitError,
  startSpotifyPlayback,
  transferSpotifyPlayback,
} from "@/widgets/spotify/lib/spotify-api";
import type { SpotifySearchResult } from "@/widgets/spotify/types";

const mockFetch = vi.mocked(integrationFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  mockFetch.mockReset();
});

describe("getSpotifyPlaybackState", () => {
  it("returns null on a 204 (nothing playing)", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(getSpotifyPlaybackState()).resolves.toBeNull();
    expect(mockFetch).toHaveBeenCalledWith("spotify", "https://api.spotify.com/v1/me/player");
  });

  it("maps a playing payload and selects the largest artwork", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        is_playing: true,
        progress_ms: 1234,
        shuffle_state: true,
        repeat_state: "track",
        device: { id: "dev1", name: "Desk", type: "Computer", is_active: true, volume_percent: 40 },
        item: {
          id: "track1",
          name: "Song",
          duration_ms: 200_000,
          artists: [{ name: "A" }, { name: "B" }],
          album: {
            name: "Album",
            images: [
              { url: "small", width: 64 },
              { url: "large", width: 640 },
            ],
          },
        },
      }),
    );

    const state = await getSpotifyPlaybackState();

    expect(state).toMatchObject({
      isPlaying: true,
      progressMs: 1234,
      shuffle: true,
      repeatMode: "track",
      device: { id: "dev1", name: "Desk", volumePercent: 40 },
      track: { title: "Song", artist: "A, B", album: "Album", artworkUrl: "large", durationMs: 200_000 },
    });
  });

  it("returns null when the payload has no track item", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ is_playing: false, item: null }));
    await expect(getSpotifyPlaybackState()).resolves.toBeNull();
  });

  it("maps a 403 to a Premium-required error", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 403 }));
    await expect(getSpotifyPlaybackState()).rejects.toThrow(/Premium/);
  });

  it("raises a rate-limit error carrying the Retry-After delay on a 429", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 429, headers: { "Retry-After": "7" } }));
    const error = await getSpotifyPlaybackState().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(SpotifyRateLimitError);
    expect((error as SpotifyRateLimitError).retryAfterMs).toBe(7000);
  });
});

describe("getSpotifyDevices", () => {
  it("drops devices without an id", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        devices: [
          { id: "a", name: "Phone", type: "Smartphone" },
          { id: null, name: "Ghost" },
        ],
      }),
    );
    const devices = await getSpotifyDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({ id: "a", name: "Phone" });
  });
});

describe("searchSpotify", () => {
  it("maps tracks, albums, and playlists into a flat result list", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        tracks: {
          items: [
            {
              id: "t1",
              uri: "spotify:track:t1",
              name: "Song",
              artists: [{ name: "A" }, { name: "B" }],
              album: { images: [{ url: "art-t", width: 640 }] },
            },
            null,
          ],
        },
        albums: {
          items: [
            {
              id: "al1",
              uri: "spotify:album:al1",
              name: "Record",
              artists: [{ name: "C" }],
              images: [{ url: "art-al", width: 300 }],
            },
          ],
        },
        playlists: {
          items: [
            {
              id: "pl1",
              uri: "spotify:playlist:pl1",
              name: "Mix",
              owner: { display_name: "Ada" },
              images: [{ url: "art-pl", width: 300 }],
            },
          ],
        },
      }),
    );

    const results = await searchSpotify("daft");

    expect(mockFetch).toHaveBeenCalledWith(
      "spotify",
      "https://api.spotify.com/v1/search?q=daft&type=track%2Calbum%2Cplaylist&limit=5",
      { signal: undefined },
    );
    expect(results).toEqual<SpotifySearchResult[]>([
      { id: "t1", uri: "spotify:track:t1", kind: "track", title: "Song", subtitle: "A, B", artworkUrl: "art-t" },
      { id: "al1", uri: "spotify:album:al1", kind: "album", title: "Record", subtitle: "C", artworkUrl: "art-al" },
      { id: "pl1", uri: "spotify:playlist:pl1", kind: "playlist", title: "Mix", subtitle: "Ada", artworkUrl: "art-pl" },
    ]);
  });

  it("raises a rate-limit error on a 429", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 429, headers: { "Retry-After": "3" } }));
    await expect(searchSpotify("x")).rejects.toBeInstanceOf(SpotifyRateLimitError);
  });

  it("flags saved tracks and sorts liked ones first", async () => {
    mockFetch.mockImplementation((_provider, url) => {
      if (String(url).includes("/search")) {
        return Promise.resolve(
          jsonResponse({
            tracks: {
              items: [
                { id: "t1", uri: "spotify:track:t1", name: "One", artists: [{ name: "A" }], album: { images: [] } },
                { id: "t2", uri: "spotify:track:t2", name: "Two", artists: [{ name: "B" }], album: { images: [] } },
              ],
            },
          }),
        );
      }
      if (String(url).includes("/me/tracks/contains")) {
        return Promise.resolve(jsonResponse([false, true]));
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    });

    const results = await searchSpotify("x");

    expect(results.map((result) => result.id)).toEqual(["t2", "t1"]);
    expect(results[0]).toMatchObject({ id: "t2", liked: true });
    expect(results[1]?.liked).toBeUndefined();
  });

  it("degrades to unflagged results when the saved-tracks check fails", async () => {
    mockFetch.mockImplementation((_provider, url) => {
      if (String(url).includes("/search")) {
        return Promise.resolve(
          jsonResponse({
            tracks: {
              items: [
                { id: "t1", uri: "spotify:track:t1", name: "One", artists: [{ name: "A" }], album: { images: [] } },
              ],
            },
          }),
        );
      }
      return Promise.resolve(new Response(null, { status: 403 }));
    });

    const results = await searchSpotify("x");
    expect(results).toEqual([
      { id: "t1", uri: "spotify:track:t1", kind: "track", title: "One", subtitle: "A", artworkUrl: undefined },
    ]);
  });
});

describe("getSpotifySavedTrackFlags", () => {
  it("maps the boolean array to a set of liked ids", async () => {
    mockFetch.mockResolvedValue(jsonResponse([true, false, true]));
    const liked = await getSpotifySavedTrackFlags(["a", "b", "c"]);
    expect(mockFetch).toHaveBeenCalledWith(
      "spotify",
      "https://api.spotify.com/v1/me/tracks/contains?ids=a%2Cb%2Cc",
      { signal: undefined },
    );
    expect([...liked].sort()).toEqual(["a", "c"]);
  });

  it("returns an empty set without calling the api when there are no ids", async () => {
    const liked = await getSpotifySavedTrackFlags([]);
    expect(liked.size).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("getMySpotifyPlaylists", () => {
  it("maps playlists and marks them as the user's own", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: "p1",
            uri: "spotify:playlist:p1",
            name: "Focus",
            owner: { display_name: "Ada" },
            images: [{ url: "art", width: 300 }],
          },
          null,
        ],
      }),
    );

    const playlists = await getMySpotifyPlaylists();

    expect(playlists).toEqual([
      {
        id: "p1",
        uri: "spotify:playlist:p1",
        kind: "playlist",
        title: "Focus",
        subtitle: "Ada",
        artworkUrl: "art",
        mine: true,
      },
    ]);
  });
});

describe("startSpotifyPlayback", () => {
  const track: SpotifySearchResult = {
    id: "t1",
    uri: "spotify:track:t1",
    kind: "track",
    title: "Song",
    subtitle: "A",
  };
  const album: SpotifySearchResult = {
    id: "al1",
    uri: "spotify:album:al1",
    kind: "album",
    title: "Record",
    subtitle: "C",
  };

  it("plays a track via uris with the device id in the query", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await startSpotifyPlayback(track, "dev1");
    expect(mockFetch).toHaveBeenCalledWith(
      "spotify",
      "https://api.spotify.com/v1/me/player/play?device_id=dev1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uris: ["spotify:track:t1"] }),
      },
    );
  });

  it("plays an album via context_uri", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await startSpotifyPlayback(album);
    expect(mockFetch).toHaveBeenCalledWith("spotify", "https://api.spotify.com/v1/me/player/play", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context_uri: "spotify:album:al1" }),
    });
  });
});

describe("playback commands", () => {
  it("issues skip-next as a POST", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await skipSpotifyNext();
    expect(mockFetch).toHaveBeenCalledWith("spotify", "https://api.spotify.com/v1/me/player/next", {
      method: "POST",
    });
  });

  it("clamps and rounds the seek position", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await seekSpotifyPlayback(-500);
    expect(mockFetch).toHaveBeenCalledWith(
      "spotify",
      "https://api.spotify.com/v1/me/player/seek?position_ms=0",
      { method: "PUT" },
    );
  });

  it("clamps volume into the 0-100 range", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await setSpotifyVolume(150);
    expect(mockFetch).toHaveBeenCalledWith(
      "spotify",
      "https://api.spotify.com/v1/me/player/volume?volume_percent=100",
      { method: "PUT" },
    );
  });

  it("serializes shuffle and repeat state", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await setSpotifyShuffle(true);
    expect(mockFetch).toHaveBeenLastCalledWith(
      "spotify",
      "https://api.spotify.com/v1/me/player/shuffle?state=true",
      { method: "PUT" },
    );
    await setSpotifyRepeatMode("context");
    expect(mockFetch).toHaveBeenLastCalledWith(
      "spotify",
      "https://api.spotify.com/v1/me/player/repeat?state=context",
      { method: "PUT" },
    );
  });

  it("transfers playback with the device id in the body", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await transferSpotifyPlayback("dev2");
    expect(mockFetch).toHaveBeenCalledWith("spotify", "https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_ids: ["dev2"] }),
    });
  });

  it("throws a no-device message on a 404", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(skipSpotifyNext()).rejects.toThrow(/Open Spotify on a device/);
  });
});
