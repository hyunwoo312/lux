import { z } from "zod";
import { tolerantArray } from "@/lib/persist";
import type { PolledDefinition } from "@/widgets/core/usePolledResource";
import {
  getMySpotifyAlbums,
  getMySpotifyLikedTracks,
  getMySpotifyPlaylists,
} from "@/widgets/spotify/lib/spotify-api";
import {
  SPOTIFY_LIBRARY_REFRESH_MS,
  SPOTIFY_SEARCH_KINDS,
  type SpotifySearchResult,
} from "@/widgets/spotify/types";

const resultSchema = z.object({
  id: z.string(),
  uri: z.string(),
  kind: z.enum(SPOTIFY_SEARCH_KINDS),
  title: z.string(),
  subtitle: z.string(),
  artworkUrl: z.string().optional(),
  liked: z.boolean().optional(),
  mine: z.boolean().optional(),
});

const listSchema = tolerantArray(resultSchema);

function parse(raw: unknown): SpotifySearchResult[] | null {
  if (!Array.isArray(raw)) return null;
  const result = listSchema.safeParse(raw);
  return result.success ? result.data : null;
}

function library(
  name: string,
  load: () => Promise<SpotifySearchResult[]>,
): PolledDefinition<SpotifySearchResult[]> {
  return {
    cacheKey: `spotify:${name}`,
    intervalMs: SPOTIFY_LIBRARY_REFRESH_MS,
    parse,
    fetch: load,
  };
}

export const spotifyPlaylists = library("playlists", getMySpotifyPlaylists);
export const spotifyAlbums = library("albums", getMySpotifyAlbums);
export const spotifyLikedTracks = library("liked", getMySpotifyLikedTracks);
