import { integrationFetch } from "@/integrations";
import type {
  SpotifyPlaybackDevice,
  SpotifyPlaybackState,
  SpotifyRepeatMode,
} from "@/widgets/spotify/types";

const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";

type SpotifyImage = { url?: string; width?: number; height?: number };

type SpotifyDevicePayload = {
  id?: string | null;
  name?: string;
  type?: string;
  is_active?: boolean;
  volume_percent?: number | null;
};

type SpotifyPlaybackPayload = {
  is_playing?: boolean;
  progress_ms?: number | null;
  shuffle_state?: boolean;
  repeat_state?: SpotifyRepeatMode;
  device?: SpotifyDevicePayload | null;
  item?: {
    id?: string;
    name?: string;
    duration_ms?: number;
    album?: { name?: string; images?: SpotifyImage[] };
    artists?: Array<{ name?: string }>;
  } | null;
};

type SpotifyDevicesPayload = { devices?: SpotifyDevicePayload[] };

export class SpotifyRateLimitError extends Error {
  retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super("Spotify rate limit reached");
    this.name = "SpotifyRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

function parseRetryAfterMs(response: Response): number {
  const seconds = Number(response.headers.get("Retry-After"));
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : 5) * 1000;
}

function getSpotifyErrorMessage(response: Response): string {
  if (response.status === 403) {
    return "Spotify Premium is required for playback controls.";
  }
  if (response.status === 404) {
    return "Open Spotify on a device, then try again.";
  }
  return "Spotify request failed.";
}

function spotifyError(response: Response): Error {
  if (response.status === 429) {
    return new SpotifyRateLimitError(parseRetryAfterMs(response));
  }
  return new Error(getSpotifyErrorMessage(response));
}

function selectArtworkUrl(images: SpotifyImage[] = []): string | undefined {
  return [...images]
    .filter((image) => image.url)
    .sort((first, second) => (second.width ?? 0) - (first.width ?? 0))[0]?.url;
}

function mapDevicePayload(device: SpotifyDevicePayload | null | undefined): SpotifyPlaybackDevice {
  return {
    id: device?.id ?? "",
    name: device?.name || "Spotify",
    type: device?.type || "Device",
    isActive: Boolean(device?.is_active),
    volumePercent: typeof device?.volume_percent === "number" ? device.volume_percent : null,
  };
}

function mapPlaybackPayload(payload: SpotifyPlaybackPayload): SpotifyPlaybackState | null {
  if (!payload.item?.id || !payload.item.name) {
    return null;
  }

  return {
    isPlaying: Boolean(payload.is_playing),
    progressMs: payload.progress_ms ?? 0,
    shuffle: Boolean(payload.shuffle_state),
    repeatMode: payload.repeat_state ?? "off",
    device: mapDevicePayload(payload.device),
    track: {
      id: payload.item.id,
      title: payload.item.name,
      artist:
        payload.item.artists
          ?.map((artist) => artist.name)
          .filter((name): name is string => Boolean(name))
          .join(", ") || "Unknown artist",
      album: payload.item.album?.name || "Unknown album",
      artworkUrl: selectArtworkUrl(payload.item.album?.images),
      durationMs: payload.item.duration_ms ?? 0,
    },
  };
}

async function sendSpotifyCommand(path: string, init: RequestInit): Promise<void> {
  const response = await integrationFetch("spotify", `${SPOTIFY_API_BASE_URL}${path}`, init);
  if (!response.ok && response.status !== 204) {
    throw spotifyError(response);
  }
}

export async function getSpotifyPlaybackState(): Promise<SpotifyPlaybackState | null> {
  const response = await integrationFetch("spotify", `${SPOTIFY_API_BASE_URL}/me/player`);

  if (response.status === 204) {
    return null;
  }
  if (!response.ok) {
    throw spotifyError(response);
  }

  return mapPlaybackPayload((await response.json()) as SpotifyPlaybackPayload);
}

export async function getSpotifyDevices(): Promise<SpotifyPlaybackDevice[]> {
  const response = await integrationFetch("spotify", `${SPOTIFY_API_BASE_URL}/me/player/devices`);
  if (!response.ok) {
    throw spotifyError(response);
  }

  const payload = (await response.json()) as SpotifyDevicesPayload;
  return (payload.devices ?? []).map(mapDevicePayload).filter((device) => device.id);
}

export async function pauseSpotifyPlayback(): Promise<void> {
  await sendSpotifyCommand("/me/player/pause", { method: "PUT" });
}

export async function resumeSpotifyPlayback(): Promise<void> {
  await sendSpotifyCommand("/me/player/play", { method: "PUT" });
}

export async function skipSpotifyNext(): Promise<void> {
  await sendSpotifyCommand("/me/player/next", { method: "POST" });
}

export async function skipSpotifyPrevious(): Promise<void> {
  await sendSpotifyCommand("/me/player/previous", { method: "POST" });
}

export async function seekSpotifyPlayback(positionMs: number): Promise<void> {
  const position = Math.max(0, Math.round(positionMs));
  await sendSpotifyCommand(`/me/player/seek?position_ms=${position}`, { method: "PUT" });
}

export async function setSpotifyVolume(volumePercent: number): Promise<void> {
  const volume = Math.min(100, Math.max(0, Math.round(volumePercent)));
  await sendSpotifyCommand(`/me/player/volume?volume_percent=${volume}`, { method: "PUT" });
}

export async function setSpotifyShuffle(enabled: boolean): Promise<void> {
  await sendSpotifyCommand(`/me/player/shuffle?state=${enabled ? "true" : "false"}`, {
    method: "PUT",
  });
}

export async function setSpotifyRepeatMode(mode: SpotifyRepeatMode): Promise<void> {
  await sendSpotifyCommand(`/me/player/repeat?state=${mode}`, { method: "PUT" });
}

export async function transferSpotifyPlayback(deviceId: string): Promise<void> {
  await sendSpotifyCommand("/me/player", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_ids: [deviceId] }),
  });
}
