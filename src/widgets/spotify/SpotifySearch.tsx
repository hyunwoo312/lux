import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Heart, Music, Play } from "lucide-react";
import { ExpandingSearch } from "@/components/ExpandingSearch";
import { cn } from "@/lib/utils";
import { getAccentVars } from "@/widgets/core/accent";
import {
  getMySpotifyPlaylists,
  getSpotifyDevices,
  searchSpotify,
  startSpotifyPlayback,
} from "@/widgets/spotify/lib/spotify-api";
import {
  SPOTIFY_ACCENT,
  type SpotifyPlaybackDevice,
  type SpotifySearchResult,
} from "@/widgets/spotify/types";
import { useSpotifyStore } from "@/widgets/spotify/useSpotifyStore";

const MAX_RESULTS = 10;
const OWNED_PLAYLIST_CAP = 3;

const SECTIONS: Array<{
  key: string;
  label: string;
  match: (result: SpotifySearchResult) => boolean;
}> = [
  { key: "mine", label: "Your playlists", match: (result) => Boolean(result.mine) },
  { key: "track", label: "Songs", match: (result) => result.kind === "track" },
  { key: "album", label: "Albums", match: (result) => result.kind === "album" },
  {
    key: "playlist",
    label: "Playlists",
    match: (result) => result.kind === "playlist" && !result.mine,
  },
];

export function SpotifySearch() {
  const baseId = useId();
  const requestRefresh = useSpotifyStore((s) => s.requestRefresh);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [devices, setDevices] = useState<SpotifyPlaybackDevice[]>([]);
  const [noDevice, setNoDevice] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<SpotifySearchResult[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getSpotifyDevices()
      .then((found) => {
        if (cancelled) return;
        setDevices(found);
        setNoDevice(!found.some((device) => device.isActive));
      })
      .catch(() => {
        if (cancelled) return;
        setDevices([]);
        setNoDevice(true);
      });
    setPlaylistsLoading(true);
    getMySpotifyPlaylists()
      .then((found) => {
        if (!cancelled) setMyPlaylists(found);
      })
      .catch(() => {
        if (!cancelled) setMyPlaylists([]);
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
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    window.clearTimeout(debounceRef.current);
    setSearching(true);
    setError(null);
    debounceRef.current = window.setTimeout(() => {
      searchSpotify(trimmed, controller.signal)
        .then((found) => {
          setResults(found);
          setActive(0);
          setSearching(false);
        })
        .catch((caught: unknown) => {
          if (caught instanceof DOMException && caught.name === "AbortError") return;
          setError("Couldn't search Spotify.");
          setSearching(false);
        });
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  const pick = (result: SpotifySearchResult) => {
    const target = devices.find((device) => device.isActive);
    if (!target) return;
    startSpotifyPlayback(result, target.id)
      .then(() => {
        requestRefresh();
        setQuery("");
        setResults([]);
        setOpen(false);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Couldn't start playback.");
      });
  };

  const trimmed = query.trim();
  const isSearch = trimmed.length >= 2;
  const ownedMatches = myPlaylists
    .filter((playlist) => playlist.title.toLowerCase().includes(trimmed.toLowerCase()))
    .slice(0, OWNED_PLAYLIST_CAP);
  const ownedIds = new Set(ownedMatches.map((playlist) => playlist.id));
  const rows = isSearch
    ? [...ownedMatches, ...results.filter((result) => !ownedIds.has(result.id))].slice(
        0,
        MAX_RESULTS,
      )
    : myPlaylists.slice(0, MAX_RESULTS);

  const hasOptions = open && !noDevice && !error && rows.length > 0;
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-opt-${index}`;

  const moveActive = (index: number) => {
    setActive(index);
    document.getElementById(optionId(index))?.scrollIntoView({ block: "nearest" });
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!hasOptions) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveActive((active + 1) % rows.length);
        return;
      case "ArrowUp":
        event.preventDefault();
        moveActive((active - 1 + rows.length) % rows.length);
        return;
      case "Enter": {
        event.preventDefault();
        const result = rows[active];
        if (result) pick(result);
        return;
      }
    }
  };

  const groups = SECTIONS.map((section) => ({
    key: section.key,
    label: section.label,
    items: rows
      .map((result, index) => ({ result, index }))
      .filter((entry) => section.match(entry.result)),
  })).filter((group) => group.items.length > 0);

  return (
    <ExpandingSearch
      open={open}
      onOpenChange={setOpen}
      value={query}
      onValueChange={setQuery}
      onInputKeyDown={onInputKeyDown}
      ariaLabel="Search Spotify"
      placeholder="Search songs, albums, playlists"
      popupOpen={open}
      listboxId={hasOptions ? listboxId : undefined}
      activeDescendantId={hasOptions ? optionId(active) : undefined}
      className="-ml-1.5"
    >
      <div
        style={getAccentVars(SPOTIFY_ACCENT)}
        className="border-input bg-popover w-full overflow-hidden rounded-sm border shadow-md"
      >
        <div className="max-h-72 overflow-y-auto p-1">
          {noDevice ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">
              No active device. Open Spotify on a device, then try again.
            </p>
          ) : error ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">{error}</p>
          ) : isSearch && searching && rows.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">Searching…</p>
          ) : isSearch && rows.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">No matching results.</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">
              {playlistsLoading
                ? "Loading your playlists…"
                : "Search songs, albums, and playlists."}
            </p>
          ) : (
            <ul role="listbox" id={listboxId} aria-label="Search results" className="flex flex-col">
              {groups.map((group) => (
                <li key={group.key}>
                  <p
                    className="
                      text-muted-foreground px-2 pt-2 pb-1 text-2xs font-medium tracking-wide
                      uppercase
                    "
                  >
                    {group.label}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {group.items.map(({ result, index }) => (
                      <li key={result.id}>
                        <button
                          type="button"
                          id={optionId(index)}
                          role="option"
                          aria-selected={index === active}
                          onMouseMove={() => setActive(index)}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => pick(result)}
                          className={cn(
                            `
                              group flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5
                              text-left transition-colors
                            `,
                            index === active ? "bg-accent text-primary" : "hover:bg-accent/60",
                          )}
                        >
                          {result.artworkUrl ? (
                            <img
                              src={result.artworkUrl}
                              alt=""
                              className="size-9 shrink-0 rounded-sm object-cover"
                            />
                          ) : (
                            <span
                              className="
                                bg-foreground/5 grid size-9 shrink-0 place-items-center rounded-sm
                              "
                            >
                              <Music className="text-muted-foreground size-4" aria-hidden />
                            </span>
                          )}
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="text-foreground truncate text-sm leading-tight">
                              {result.title}
                            </span>
                            <span className="text-muted-foreground truncate text-xs leading-tight">
                              {result.subtitle}
                            </span>
                          </span>
                          {result.liked && (
                            <Heart
                              className="text-primary size-3.5 shrink-0 fill-current"
                              aria-hidden
                            />
                          )}
                          <Play
                            className={cn(
                              "size-3.5 shrink-0 transition-opacity",
                              index === active ? "opacity-100" : "opacity-0",
                            )}
                            aria-hidden
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ExpandingSearch>
  );
}
