import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations", () => ({ integrationFetch: vi.fn() }));

import { integrationFetch } from "@/integrations";
import {
  getSpotifyDevices,
  getSpotifyPlaybackState,
  seekSpotifyPlayback,
  setSpotifyRepeatMode,
  setSpotifyShuffle,
  setSpotifyVolume,
  skipSpotifyNext,
  SpotifyRateLimitError,
  transferSpotifyPlayback,
} from "@/widgets/spotify/lib/spotify-api";

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
