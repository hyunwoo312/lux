import { integrationFetch } from "@/integrations";
import type {
  SpotifyPlaybackDevice,
  SpotifyPlaybackState,
  SpotifyQueueItem,
  SpotifyRepeatMode,
  SpotifySearchResult,
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

type SpotifyQueueTrackPayload = {
  id?: string;
  uri?: string;
  name?: string;
  artists?: SpotifyArtistRef[];
  album?: { images?: SpotifyImage[] };
  images?: SpotifyImage[];
};

type SpotifyQueuePayload = { queue?: Array<SpotifyQueueTrackPayload | null> };

type SpotifyArtistRef = { name?: string };

type SpotifySearchTrackItem = {
  id?: string;
  uri?: string;
  name?: string;
  artists?: SpotifyArtistRef[];
  album?: { images?: SpotifyImage[] };
};

type SpotifySearchAlbumItem = {
  id?: string;
  uri?: string;
  name?: string;
  artists?: SpotifyArtistRef[];
  images?: SpotifyImage[];
};

type SpotifySearchPlaylistItem = {
  id?: string;
  uri?: string;
  name?: string;
  owner?: { display_name?: string };
  images?: SpotifyImage[];
};

type SpotifySearchPayload = {
  tracks?: { items?: Array<SpotifySearchTrackItem | null> };
  albums?: { items?: Array<SpotifySearchAlbumItem | null> };
  playlists?: { items?: Array<SpotifySearchPlaylistItem | null> };
};

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

function joinArtistNames(artists: SpotifyArtistRef[] = []): string {
  return (
    artists
      .map((artist) => artist.name)
      .filter((name): name is string => Boolean(name))
      .join(", ") || "Unknown artist"
  );
}

function mapSearchTrack(item: SpotifySearchTrackItem | null): SpotifySearchResult | null {
  if (!item?.id || !item.uri || !item.name) return null;
  return {
    id: item.id,
    uri: item.uri,
    kind: "track",
    title: item.name,
    subtitle: joinArtistNames(item.artists),
    artworkUrl: selectArtworkUrl(item.album?.images),
  };
}

function mapSearchAlbum(item: SpotifySearchAlbumItem | null): SpotifySearchResult | null {
  if (!item?.id || !item.uri || !item.name) return null;
  return {
    id: item.id,
    uri: item.uri,
    kind: "album",
    title: item.name,
    subtitle: joinArtistNames(item.artists),
    artworkUrl: selectArtworkUrl(item.images),
  };
}

function mapSearchPlaylist(item: SpotifySearchPlaylistItem | null): SpotifySearchResult | null {
  if (!item?.id || !item.uri || !item.name) return null;
  return {
    id: item.id,
    uri: item.uri,
    kind: "playlist",
    title: item.name,
    subtitle: item.owner?.display_name || "Playlist",
    artworkUrl: selectArtworkUrl(item.images),
  };
}

const SEARCH_RESULT_CAPS: Record<SpotifySearchResult["kind"], number> = {
  track: 4,
  album: 3,
  playlist: 3,
};

function takeResults<T>(
  items: Array<T | null>,
  mapper: (item: T | null) => SpotifySearchResult | null,
  cap: number,
): SpotifySearchResult[] {
  return items
    .map(mapper)
    .filter((result): result is SpotifySearchResult => result !== null)
    .slice(0, cap);
}

async function flagLikedTracks(
  tracks: SpotifySearchResult[],
  signal?: AbortSignal,
): Promise<SpotifySearchResult[]> {
  if (tracks.length === 0) return tracks;
  let liked: Set<string>;
  try {
    liked = await getSpotifySavedTrackFlags(
      tracks.map((track) => track.id),
      signal,
    );
  } catch {
    return tracks;
  }
  const flagged = tracks.map((track) =>
    liked.has(track.id) ? { ...track, liked: true } : track,
  );
  return [...flagged.filter((track) => track.liked), ...flagged.filter((track) => !track.liked)];
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

function mapQueueItem(item: SpotifyQueueTrackPayload | null): SpotifyQueueItem | null {
  if (!item?.id || !item.uri || !item.name) return null;
  return {
    id: item.id,
    uri: item.uri,
    title: item.name,
    subtitle: joinArtistNames(item.artists),
    artworkUrl: selectArtworkUrl(item.album?.images ?? item.images),
  };
}

export async function getSpotifyQueue(signal?: AbortSignal): Promise<SpotifyQueueItem[]> {
  const response = await integrationFetch("spotify", `${SPOTIFY_API_BASE_URL}/me/player/queue`, {
    signal,
  });
  if (response.status === 204) {
    return [];
  }
  if (!response.ok) {
    throw spotifyError(response);
  }
  const payload = (await response.json()) as SpotifyQueuePayload;
  return (payload.queue ?? [])
    .map(mapQueueItem)
    .filter((item): item is SpotifyQueueItem => item !== null);
}

const SPOTIFY_SEARCH_TYPES = "track,album,playlist";
const SPOTIFY_SEARCH_LIMIT = 5;

export async function searchSpotify(
  query: string,
  signal?: AbortSignal,
): Promise<SpotifySearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    type: SPOTIFY_SEARCH_TYPES,
    limit: String(SPOTIFY_SEARCH_LIMIT),
  });
  const response = await integrationFetch(
    "spotify",
    `${SPOTIFY_API_BASE_URL}/search?${params.toString()}`,
    { signal },
  );
  if (!response.ok) {
    throw spotifyError(response);
  }
  const payload = (await response.json()) as SpotifySearchPayload;
  const tracks = await flagLikedTracks(
    takeResults(payload.tracks?.items ?? [], mapSearchTrack, SEARCH_RESULT_CAPS.track),
    signal,
  );
  const albums = takeResults(payload.albums?.items ?? [], mapSearchAlbum, SEARCH_RESULT_CAPS.album);
  const playlists = takeResults(
    payload.playlists?.items ?? [],
    mapSearchPlaylist,
    SEARCH_RESULT_CAPS.playlist,
  );
  return [...tracks, ...albums, ...playlists];
}

export async function getSpotifySavedTrackFlags(
  ids: string[],
  signal?: AbortSignal,
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const params = new URLSearchParams({ ids: ids.join(",") });
  const response = await integrationFetch(
    "spotify",
    `${SPOTIFY_API_BASE_URL}/me/tracks/contains?${params.toString()}`,
    { signal },
  );
  if (!response.ok) {
    throw spotifyError(response);
  }
  const flags = (await response.json()) as unknown;
  if (!Array.isArray(flags)) return new Set();
  const liked = new Set<string>();
  flags.forEach((isLiked, index) => {
    const id = ids[index];
    if (isLiked === true && id) liked.add(id);
  });
  return liked;
}

export async function getMySpotifyPlaylists(signal?: AbortSignal): Promise<SpotifySearchResult[]> {
  const params = new URLSearchParams({ limit: "50" });
  const response = await integrationFetch(
    "spotify",
    `${SPOTIFY_API_BASE_URL}/me/playlists?${params.toString()}`,
    { signal },
  );
  if (!response.ok) {
    throw spotifyError(response);
  }
  const payload = (await response.json()) as { items?: Array<SpotifySearchPlaylistItem | null> };
  return (payload.items ?? [])
    .map(mapSearchPlaylist)
    .filter((result): result is SpotifySearchResult => result !== null)
    .map((result) => ({ ...result, mine: true }));
}

export async function startSpotifyPlayback(
  result: SpotifySearchResult,
  deviceId?: string,
): Promise<void> {
  const body = result.kind === "track" ? { uris: [result.uri] } : { context_uri: result.uri };
  const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";
  await sendSpotifyCommand(`/me/player/play${query}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function addSpotifyToQueue(uri: string, deviceId?: string): Promise<void> {
  const params = new URLSearchParams({ uri });
  if (deviceId) params.set("device_id", deviceId);
  await sendSpotifyCommand(`/me/player/queue?${params.toString()}`, { method: "POST" });
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
