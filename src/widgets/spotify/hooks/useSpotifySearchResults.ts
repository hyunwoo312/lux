import { useEffect, useMemo, useState } from "react";
import { searchResults, useDebouncedSearch, type SearchState } from "@/hooks/useDebouncedSearch";
import { getSpotifySavedTrackFlags, searchSpotify } from "@/widgets/spotify/lib/spotify-api";
import { usePolledDefinition } from "@/widgets/core/usePolledResource";
import { spotifyPlaylists } from "@/widgets/spotify/lib/resources";
import type { SpotifySearchResult } from "@/widgets/spotify/types";

const MIN_QUERY_LENGTH = 2;

const EMPTY_PLAYLISTS: SpotifySearchResult[] = [];

export type SpotifySearchResults = {
  query: string;
  setQuery: (query: string) => void;
  state: SearchState<SpotifySearchResult>;
  results: SpotifySearchResult[];
  playlists: SpotifySearchResult[];
  playlistsLoading: boolean;
};

export function useSpotifySearchResults(open: boolean): SpotifySearchResults {
  const [query, setQuery] = useState("");
  const [liked, setLiked] = useState<ReadonlySet<string>>(new Set());

  const state = useDebouncedSearch(query, searchSpotify, { minLength: MIN_QUERY_LENGTH });
  const found = searchResults(state);

  const mine = usePolledDefinition(spotifyPlaylists, { enabled: open });
  const playlists = mine.state.status === "success" ? mine.state.data : EMPTY_PLAYLISTS;

  useEffect(() => {
    const trackIds = found.filter((result) => result.kind === "track").map((result) => result.id);
    if (trackIds.length === 0) return;
    const controller = new AbortController();
    const markLiked = async () => {
      try {
        const saved = await getSpotifySavedTrackFlags(trackIds, controller.signal);
        if (controller.signal.aborted || saved.size === 0) return;
        setLiked((previous) => new Set([...previous, ...saved]));
      } catch {
        return;
      }
    };
    void markLiked();
    return () => controller.abort();
  }, [found]);

  const results = useMemo(
    () => found.map((result) => (liked.has(result.id) ? { ...result, liked: true } : result)),
    [found, liked],
  );

  return {
    query,
    setQuery,
    state,
    results,
    playlists,
    playlistsLoading: mine.state.status === "loading",
  };
}
