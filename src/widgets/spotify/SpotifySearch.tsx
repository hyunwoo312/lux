import { useEffect, useId, useState } from "react";
import { RemoteImage } from "@/components/media/RemoteImage";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, Heart, ListPlus, Music, Play } from "lucide-react";
import { ExpandingSearch } from "@/components/ExpandingSearch";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSpotifySearchResults } from "@/widgets/spotify/hooks/useSpotifySearchResults";
import {
  addSpotifyToQueue,
  getSpotifyDevices,
  startSpotifyPlayback,
} from "@/widgets/spotify/lib/spotify-api";
import { type SpotifyPlaybackDevice, type SpotifySearchResult } from "@/widgets/spotify/types";
import {
  loadSpotifyQueue,
  requestSpotifyPlaybackRefresh,
} from "@/widgets/spotify/hooks/useSpotifyPlayback";

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

  const [open, setOpen] = useState(false);
  const {
    query,
    setQuery,
    results,
    playlists,
    playlistsLoading,
    searching,
    error: searchError,
    active,
    setActive,
  } = useSpotifySearchResults(open);
  const [actionError, setActionError] = useState<string | null>(null);
  const error = searchError ?? actionError;
  const [devices, setDevices] = useState<SpotifyPlaybackDevice[]>([]);
  const [targetDeviceId, setTargetDeviceId] = useState<string | null>(null);
  const [queueingId, setQueueingId] = useState<string | null>(null);
  const [queuedIds, setQueuedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) return;
    setQueuedIds(new Set());
    setQueueingId(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getSpotifyDevices()
      .then((found) => {
        if (cancelled) return;
        setDevices(found);
      })
      .catch(() => {
        if (cancelled) return;
        setDevices([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const targetDevice =
    devices.find((device) => device.id === targetDeviceId) ??
    devices.find((device) => device.isActive) ??
    (devices.length === 1 ? devices[0] : undefined);

  const pick = (result: SpotifySearchResult) => {
    if (!targetDevice) return;
    setActionError(null);
    startSpotifyPlayback(result, targetDevice.id)
      .then(() => {
        requestSpotifyPlaybackRefresh();
        setQuery("");
        setOpen(false);
      })
      .catch((caught: unknown) => {
        setActionError(caught instanceof Error ? caught.message : "Couldn't start playback.");
      });
  };

  const addToQueue = (result: SpotifySearchResult) => {
    if (!targetDevice || queueingId === result.id || queuedIds.has(result.id)) return;
    setActionError(null);
    setQueueingId(result.id);
    addSpotifyToQueue(result.uri, targetDevice.id)
      .then(() => {
        void loadSpotifyQueue();
        setQueuedIds((prev) => new Set(prev).add(result.id));
      })
      .catch((caught: unknown) => {
        setActionError(caught instanceof Error ? caught.message : "Couldn't add to queue.");
      })
      .finally(() => setQueueingId(null));
  };

  const trimmed = query.trim();
  const isSearch = trimmed.length >= 2;
  const ownedMatches = playlists
    .filter((playlist) => playlist.title.toLowerCase().includes(trimmed.toLowerCase()))
    .slice(0, OWNED_PLAYLIST_CAP);
  const ownedIds = new Set(ownedMatches.map((playlist) => playlist.id));
  const rows = isSearch
    ? [...ownedMatches, ...results.filter((result) => !ownedIds.has(result.id))].slice(
        0,
        MAX_RESULTS,
      )
    : playlists.slice(0, MAX_RESULTS);

  const hasOptions = open && !error && rows.length > 0;
  const needsDeviceChoice = !targetDevice && devices.length > 0;
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
        className={cn("border-input bg-popover w-full overflow-hidden rounded-sm border shadow-md")}
      >
        <div className="max-h-72 overflow-y-auto p-1">
          {devices.length === 0 && (
            <p className="border-border/60 text-ink-3 border-b px-2 py-2 text-caption">
              Open Spotify on a device to start playback.
            </p>
          )}
          {needsDeviceChoice && (
            <div
              className="
                border-border/60 flex flex-wrap items-center gap-1 border-b px-2 pt-1.5 pb-2
              "
            >
              <span className="text-ink-3 text-micro mr-0.5">Play on</span>
              {devices.map((device) => (
                <button
                  key={device.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setTargetDeviceId(device.id)}
                  className="
                    press cursor-pointer focus-ring border-border text-ink-3 rounded-full border
                    px-2 py-0.5 text-micro
                    hover:text-ink hover:border-foreground/40
                  "
                >
                  {device.name}
                </button>
              ))}
            </div>
          )}
          {error ? (
            <p className="text-ink-3 px-2 py-2 text-caption">{error}</p>
          ) : isSearch && searching && rows.length === 0 ? (
            <p className="text-ink-3 px-2 py-2 text-caption">Searching…</p>
          ) : isSearch && rows.length === 0 ? (
            <p className="text-ink-3 px-2 py-2 text-caption">No matching results.</p>
          ) : rows.length === 0 ? (
            <p className="text-ink-3 px-2 py-2 text-caption">
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
                      text-ink-3 px-2 pt-2 pb-1 text-micro font-medium tracking-wide uppercase
                    "
                  >
                    {group.label}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {group.items.map(({ result, index }) => (
                      <li key={result.id}>
                        <div
                          id={optionId(index)}
                          role="option"
                          aria-selected={index === active}
                          onMouseMove={() => setActive(index)}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => pick(result)}
                          className={cn(
                            `
                              group flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-2
                              py-1.5 text-left transition-colors
                            `,
                            index === active ? "bg-accent text-primary" : "hover:bg-accent/60",
                          )}
                        >
                          {result.artworkUrl ? (
                            <RemoteImage
                              src={result.artworkUrl}
                              alt=""
                              className="size-9 shrink-0 rounded-md object-cover"
                            />
                          ) : (
                            <span
                              className="
                                bg-foreground/5 grid size-9 shrink-0 place-items-center rounded-md
                              "
                            >
                              <Music className="text-ink-3 size-4" aria-hidden />
                            </span>
                          )}
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="text-ink truncate text-body leading-tight">
                              {result.title}
                            </span>
                            <span className="text-ink-3 truncate text-caption leading-tight">
                              {result.subtitle}
                            </span>
                          </span>
                          {result.liked && (
                            <Heart
                              className="text-primary size-3.5 shrink-0 fill-current"
                              aria-hidden
                            />
                          )}
                          {result.kind === "track" && (
                            <Tooltip
                              content={queuedIds.has(result.id) ? "Added to queue" : "Add to queue"}
                              side="top"
                            >
                              <button
                                type="button"
                                aria-label={
                                  queuedIds.has(result.id) ? "Added to queue" : "Add to queue"
                                }
                                disabled={queueingId === result.id || queuedIds.has(result.id)}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  addToQueue(result);
                                }}
                                className={cn(
                                  "press cursor-pointer",
                                  `
                                    focus-ring grid size-6 shrink-0 place-items-center rounded-sm
                                    transition-colors
                                    disabled:pointer-events-none
                                  `,
                                  queuedIds.has(result.id)
                                    ? "text-primary"
                                    : "text-ink-3 hover:text-ink",
                                  queueingId === result.id && "opacity-50",
                                )}
                              >
                                {queuedIds.has(result.id) ? (
                                  <Check className="size-3.5" aria-hidden />
                                ) : (
                                  <ListPlus className="size-3.5" aria-hidden />
                                )}
                              </button>
                            </Tooltip>
                          )}
                          <Play
                            className={cn(
                              "size-3.5 shrink-0 transition-opacity",
                              index === active ? "opacity-100" : "opacity-0",
                            )}
                            aria-hidden
                          />
                        </div>
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
