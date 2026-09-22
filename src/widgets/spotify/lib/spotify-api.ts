import { z } from "zod";
import { integrationFetch } from "@/integrations";
import { RateLimitError, readJson, retryAfterMs } from "@/lib/net";

const DEFAULT_RETRY_AFTER_MS = 5_000;
import {
  SPOTIFY_REPEAT_MODES,
  type SpotifyErrorKind,
  type SpotifyPlaybackContext,
  type SpotifyPlaybackDevice,
  type SpotifyPlaybackState,
  type SpotifyQueueItem,
  type SpotifyRepeatMode,
  type SpotifySearchKind,
  type SpotifySearchResult,
} from "@/widgets/spotify/types";
import { clamp } from "@/lib/utils";

const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";

const leaf = <T>(schema: z.ZodType<T>) => schema.optional().catch(undefined);

const imageSchema = z.object({
  url: leaf(z.string()),
  width: leaf(z.number()),
  height: leaf(z.number()),
});
const imagesSchema = z.array(imageSchema.catch({})).catch([]);
const artistsSchema = z.array(z.object({ name: leaf(z.string()) }).catch({})).catch([]);

const deviceSchema = z.object({
  id: leaf(z.string().nullable()),
  name: leaf(z.string()),
  type: leaf(z.string()),
  is_active: leaf(z.boolean()),
  volume_percent: leaf(z.number().nullable()),
});

const playbackEnvelope = z.object({
  is_playing: leaf(z.boolean()),
  progress_ms: leaf(z.number().nullable()),
  shuffle_state: leaf(z.boolean()),
  repeat_state: leaf(z.enum(SPOTIFY_REPEAT_MODES)),
  device: leaf(deviceSchema.nullable()),
  context: leaf(z.object({ uri: leaf(z.string()), type: leaf(z.string()) }).nullable()),
  item: leaf(
    z
      .object({
        id: leaf(z.string()),
        name: leaf(z.string()),
        duration_ms: leaf(z.number()),
        album: leaf(z.object({ name: leaf(z.string()), images: leaf(imagesSchema) })),
        artists: leaf(artistsSchema),
      })
      .nullable(),
  ),
});

const searchTrackItem = z
  .object({
    id: leaf(z.string()),
    uri: leaf(z.string()),
    name: leaf(z.string()),
    artists: leaf(artistsSchema),
    album: leaf(z.object({ images: leaf(imagesSchema) })),
  })
  .nullable()
  .catch(null);

const searchAlbumItem = z
  .object({
    id: leaf(z.string()),
    uri: leaf(z.string()),
    name: leaf(z.string()),
    artists: leaf(artistsSchema),
    images: leaf(imagesSchema),
  })
  .nullable()
  .catch(null);

const searchPlaylistItem = z
  .object({
    id: leaf(z.string()),
    uri: leaf(z.string()),
    name: leaf(z.string()),
    owner: leaf(z.object({ display_name: leaf(z.string()) })),
    images: leaf(imagesSchema),
  })
  .nullable()
  .catch(null);

const queueTrackItem = z
  .object({
    id: leaf(z.string()),
    uri: leaf(z.string()),
    name: leaf(z.string()),
    artists: leaf(artistsSchema),
    album: leaf(z.object({ images: leaf(imagesSchema) })),
    images: leaf(imagesSchema),
  })
  .nullable()
  .catch(null);

const nameEnvelope = z.object({ name: z.unknown().optional() });
const devicesEnvelope = z.object({ devices: leaf(z.array(deviceSchema.catch({}))) });
const queueEnvelope = z.object({ queue: leaf(z.array(queueTrackItem)) });
const searchEnvelope = z.object({
  tracks: leaf(z.object({ items: leaf(z.array(searchTrackItem)) })),
  albums: leaf(z.object({ items: leaf(z.array(searchAlbumItem)) })),
  playlists: leaf(z.object({ items: leaf(z.array(searchPlaylistItem)) })),
});
const playlistsEnvelope = z.object({ items: leaf(z.array(searchPlaylistItem)) });
const savedAlbumsEnvelope = z.object({
  items: leaf(z.array(z.object({ album: leaf(searchAlbumItem) }).catch({}))),
});
const savedTracksEnvelope = z.object({
  items: leaf(z.array(z.object({ track: leaf(searchTrackItem) }).catch({}))),
});

type SpotifyImage = z.infer<typeof imageSchema>;
type SpotifyArtistRef = z.infer<typeof artistsSchema>[number];
type SpotifyDevicePayload = z.infer<typeof deviceSchema>;
type SpotifyPlaybackPayload = z.infer<typeof playbackEnvelope>;
type SpotifyQueueTrackPayload = z.infer<typeof queueTrackItem>;
type SpotifySearchTrackItem = z.infer<typeof searchTrackItem>;
type SpotifySearchAlbumItem = z.infer<typeof searchAlbumItem>;
type SpotifySearchPlaylistItem = z.infer<typeof searchPlaylistItem>;

function toArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export class SpotifyRequestError extends Error {
  readonly kind: SpotifyErrorKind;
  constructor(kind: SpotifyErrorKind, message: string) {
    super(message);
    this.name = "SpotifyRequestError";
    this.kind = kind;
  }
}

function spotifyError(response: Response): Error {
  if (response.status === 429) {
    return new RateLimitError(retryAfterMs(response) || DEFAULT_RETRY_AFTER_MS);
  }
  if (response.status === 403) {
    return new SpotifyRequestError("premium", "Spotify Premium is required for playback controls.");
  }
  if (response.status === 404) {
    return new SpotifyRequestError("noDevice", "Open Spotify on a device, then try again.");
  }
  return new SpotifyRequestError("unknown", "Spotify request failed.");
}

function selectArtworkUrl(images: SpotifyImage[] = []): string | undefined {
  return [...images]
    .filter((image) => image.url)
    .sort((first, second) => (second.width ?? 0) - (first.width ?? 0))[0]?.url;
}

function joinArtistNames(artists: SpotifyArtistRef[] = []): string {
  return (
    toArray(artists)
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

function mapDevicePayload(device: SpotifyDevicePayload | null | undefined): SpotifyPlaybackDevice {
  return {
    id: device?.id ?? "",
    name: device?.name || "Spotify",
    type: device?.type || "Device",
    isActive: Boolean(device?.is_active),
    volumePercent: typeof device?.volume_percent === "number" ? device.volume_percent : null,
  };
}

const CONTEXT_KINDS = ["playlist", "album", "artist"] as const;

function mapContextPayload(
  context: SpotifyPlaybackPayload["context"],
): SpotifyPlaybackContext | null {
  const uri = context?.uri;
  const kind = CONTEXT_KINDS.find((entry) => entry === context?.type);
  return uri && kind ? { uri, kind } : null;
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
    context: mapContextPayload(payload.context),
    track: {
      id: payload.item.id,
      title: payload.item.name,
      artist: joinArtistNames(payload.item.artists),
      album: payload.item.album?.name || "Unknown album",
      artworkUrl: selectArtworkUrl(payload.item.album?.images),
      durationMs: payload.item.duration_ms ?? 0,
    },
  };
}

async function sendSpotifyCommand(path: string, init: RequestInit): Promise<void> {
  const response = await integrationFetch("spotify", `${SPOTIFY_API_BASE_URL}${path}`, init);
  if (!response.ok) {
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

  return mapPlaybackPayload(await readJson(response, "Spotify playback", playbackEnvelope));
}

const CONTEXT_PATHS: Record<SpotifyPlaybackContext["kind"], string> = {
  playlist: "playlists",
  album: "albums",
  artist: "artists",
};

export async function getSpotifyContextName(
  context: SpotifyPlaybackContext,
): Promise<string | null> {
  const id = context.uri.split(":").pop();
  if (!id) return null;
  const response = await integrationFetch(
    "spotify",
    `${SPOTIFY_API_BASE_URL}/${CONTEXT_PATHS[context.kind]}/${encodeURIComponent(id)}`,
  );
  if (!response.ok) {
    throw spotifyError(response);
  }
  const payload = await readJson(response, "Spotify context", nameEnvelope);
  if (typeof payload.name !== "string" || payload.name.length === 0) return null;
  return payload.name;
}

export async function getSpotifyDevices(): Promise<SpotifyPlaybackDevice[]> {
  const response = await integrationFetch("spotify", `${SPOTIFY_API_BASE_URL}/me/player/devices`);
  if (!response.ok) {
    throw spotifyError(response);
  }

  const payload = await readJson(response, "Spotify devices", devicesEnvelope);
  return toArray(payload.devices)
    .map(mapDevicePayload)
    .filter((device) => device.id);
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

export async function getSpotifyQueue(): Promise<SpotifyQueueItem[]> {
  const response = await integrationFetch("spotify", `${SPOTIFY_API_BASE_URL}/me/player/queue`);
  if (response.status === 204) {
    return [];
  }
  if (!response.ok) {
    throw spotifyError(response);
  }
  const payload = await readJson(response, "Spotify queue", queueEnvelope);
  return toArray(payload.queue)
    .map(mapQueueItem)
    .filter((item): item is SpotifyQueueItem => item !== null);
}

const SPOTIFY_SEARCH_TYPES = "track,album,playlist";
const SPOTIFY_SEARCH_LIMIT = 5;
const SPOTIFY_KIND_SEARCH_LIMIT = 8;
const LIBRARY_PAGE_SIZE = 50;

export async function searchSpotify(
  query: string,
  signal?: AbortSignal,
  kind?: SpotifySearchKind,
): Promise<SpotifySearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    type: kind ?? SPOTIFY_SEARCH_TYPES,
    limit: String(kind === undefined ? SPOTIFY_SEARCH_LIMIT : SPOTIFY_KIND_SEARCH_LIMIT),
  });
  const response = await integrationFetch(
    "spotify",
    `${SPOTIFY_API_BASE_URL}/search?${params.toString()}`,
    { signal },
  );
  if (!response.ok) {
    throw spotifyError(response);
  }
  const payload = await readJson(response, "Spotify search", searchEnvelope);
  const cap = (of: SpotifySearchKind) =>
    kind === undefined ? SEARCH_RESULT_CAPS[of] : SPOTIFY_KIND_SEARCH_LIMIT;
  const tracks = takeResults(toArray(payload.tracks?.items), mapSearchTrack, cap("track"));
  const albums = takeResults(toArray(payload.albums?.items), mapSearchAlbum, cap("album"));
  const playlists = takeResults(
    toArray(payload.playlists?.items),
    mapSearchPlaylist,
    cap("playlist"),
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
  const flags = await readJson(response, "Spotify liked songs", z.array(z.unknown()).catch([]));
  const liked = new Set<string>();
  flags.forEach((isLiked, index) => {
    const id = ids[index];
    if (isLiked === true && id) liked.add(id);
  });
  return liked;
}

export async function getMySpotifyPlaylists(): Promise<SpotifySearchResult[]> {
  const params = new URLSearchParams({ limit: "50" });
  const response = await integrationFetch(
    "spotify",
    `${SPOTIFY_API_BASE_URL}/me/playlists?${params.toString()}`,
  );
  if (!response.ok) {
    throw spotifyError(response);
  }
  const payload = await readJson(response, "Spotify playlists", playlistsEnvelope);
  return toArray(payload.items)
    .map(mapSearchPlaylist)
    .filter((result): result is SpotifySearchResult => result !== null)
    .map((result) => ({ ...result, mine: true }));
}

export async function getMySpotifyAlbums(): Promise<SpotifySearchResult[]> {
  const params = new URLSearchParams({ limit: String(LIBRARY_PAGE_SIZE) });
  const response = await integrationFetch(
    "spotify",
    `${SPOTIFY_API_BASE_URL}/me/albums?${params.toString()}`,
  );
  if (!response.ok) {
    throw spotifyError(response);
  }
  const payload = await readJson(response, "Spotify albums", savedAlbumsEnvelope);
  return toArray(payload.items)
    .map((entry) => mapSearchAlbum(entry?.album ?? null))
    .filter((result): result is SpotifySearchResult => result !== null);
}

export async function getMySpotifyLikedTracks(): Promise<SpotifySearchResult[]> {
  const params = new URLSearchParams({ limit: String(LIBRARY_PAGE_SIZE) });
  const response = await integrationFetch(
    "spotify",
    `${SPOTIFY_API_BASE_URL}/me/tracks?${params.toString()}`,
  );
  if (!response.ok) {
    throw spotifyError(response);
  }
  const payload = await readJson(response, "Spotify liked songs", savedTracksEnvelope);
  return toArray(payload.items)
    .map((entry) => mapSearchTrack(entry?.track ?? null))
    .filter((result): result is SpotifySearchResult => result !== null);
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
  const volume = clamp(Math.round(volumePercent), 0, 100);
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
