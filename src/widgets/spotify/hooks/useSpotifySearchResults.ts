import { useEffect, useRef, useState } from "react";
import {
  getMySpotifyPlaylists,
  getSpotifySavedTrackFlags,
  searchSpotify,
} from "@/widgets/spotify/lib/spotify-api";
import type { SpotifySearchResult } from "@/widgets/spotify/types";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export type SpotifySearchResults = {
  query: string;
  setQuery: (query: string) => void;
  results: SpotifySearchResult[];
  playlists: SpotifySearchResult[];
  playlistsLoading: boolean;
  searching: boolean;
  error: string | null;
  active: number;
  setActive: (index: number) => void;
};

export function useSpotifySearchResults(open: boolean): SpotifySearchResults {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifySearchResult[]>([]);
  const [playlists, setPlaylists] = useState<SpotifySearchResult[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPlaylistsLoading(true);
    getMySpotifyPlaylists()
      .then((found) => {
        if (!cancelled) setPlaylists(found);
      })
      .catch(() => {
        if (!cancelled) setPlaylists([]);
      })
      .finally(() => {
        if (!cancelled) setPlaylistsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    window.clearTimeout(debounceRef.current);
    setSearching(true);
    setError(null);

    const markLiked = async (found: SpotifySearchResult[]) => {
      const ids = found.filter((result) => result.kind === "track").map((result) => result.id);
      if (ids.length === 0) return;
      let liked: Set<string>;
      try {
        liked = await getSpotifySavedTrackFlags(ids, controller.signal);
      } catch {
        return;
      }
      if (controller.signal.aborted || liked.size === 0) return;
      setResults((prev) =>
        prev.map((result) => (liked.has(result.id) ? { ...result, liked: true } : result)),
      );
    };

    debounceRef.current = window.setTimeout(() => {
      searchSpotify(trimmed, controller.signal)
        .then((found) => {
          setResults(found);
          setActive(0);
          setSearching(false);
          void markLiked(found);
        })
        .catch((caught: unknown) => {
          if (caught instanceof DOMException && caught.name === "AbortError") return;
          setError("Couldn't search Spotify.");
          setSearching(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  return {
    query,
    setQuery,
    results,
    playlists,
    playlistsLoading,
    searching,
    error,
    active,
    setActive,
  };
}
