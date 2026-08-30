import { useEffect, useMemo, useState } from "react";
import { ExpandingSearch } from "@/components/ExpandingSearch";
import { useComboboxCursor } from "@/hooks/useComboboxCursor";
import { SpotifyDeviceChooser } from "@/widgets/spotify/components/SpotifyDeviceChooser";
import { SpotifySearchRow } from "@/widgets/spotify/components/SpotifySearchRow";
import { useSpotifySearchResults } from "@/widgets/spotify/hooks/useSpotifySearchResults";
import {
  addSpotifyToQueue,
  getSpotifyDevices,
  startSpotifyPlayback,
} from "@/widgets/spotify/lib/spotify-api";
import { type SpotifyPlaybackDevice, type SpotifySearchResult } from "@/widgets/spotify/types";
import { resolveSpotifyDevice } from "@/widgets/spotify/lib/devices";
import {
  loadSpotifyQueue,
  requestSpotifyPlaybackRefresh,
} from "@/widgets/spotify/hooks/useSpotifyPlayback";

const MAX_RESULTS = 10;
const OWNED_PLAYLIST_CAP = 3;
const MIN_QUERY_LENGTH = 2;

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
  const [open, setOpen] = useState(false);
  const { query, setQuery, state, results, playlists, playlistsLoading } =
    useSpotifySearchResults(open);
  const [actionError, setActionError] = useState<string | null>(null);
  const error = state.status === "error" ? "Couldn't search Spotify." : actionError;
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
    devices.find((device) => device.id === targetDeviceId) ?? resolveSpotifyDevice(devices);

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
  const isSearch = trimmed.length >= MIN_QUERY_LENGTH;
  const rows = useMemo(() => {
    if (!isSearch) return playlists.slice(0, MAX_RESULTS);
    const owned = playlists
      .filter((playlist) => playlist.title.toLowerCase().includes(trimmed.toLowerCase()))
      .slice(0, OWNED_PLAYLIST_CAP);
    const ownedIds = new Set(owned.map((playlist) => playlist.id));
    return [...owned, ...results.filter((result) => !ownedIds.has(result.id))].slice(
      0,
      MAX_RESULTS,
    );
  }, [isSearch, playlists, results, trimmed]);

  const hasOptions = open && !error && rows.length > 0;
  const needsDeviceChoice = !targetDevice && devices.length > 0;

  const { active, setActive, listboxId, optionId, onInputKeyDown } = useComboboxCursor(rows, {
    enabled: hasOptions,
    onPick: pick,
  });

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
      <SpotifyDeviceChooser
        devices={devices}
        needsChoice={needsDeviceChoice}
        onSelect={setTargetDeviceId}
      />
      {error ? (
        <p className="text-ink-3 px-2 py-2 text-caption">{error}</p>
      ) : isSearch && state.status === "loading" && rows.length === 0 ? (
        <p className="text-ink-3 px-2 py-2 text-caption">Searching…</p>
      ) : isSearch && rows.length === 0 ? (
        <p className="text-ink-3 px-2 py-2 text-caption">No matching results.</p>
      ) : rows.length === 0 ? (
        <p className="text-ink-3 px-2 py-2 text-caption">
          {playlistsLoading ? "Loading your playlists…" : "Search songs, albums, and playlists."}
        </p>
      ) : (
        <ul role="listbox" id={listboxId} aria-label="Search results" className="flex flex-col">
          {groups.map((group) => (
            <li key={group.key} role="group" aria-label={group.label}>
              <p
                aria-hidden
                className="text-ink-3 px-2 pt-2 pb-1 text-micro font-medium tracking-wide uppercase"
              >
                {group.label}
              </p>
              <ul role="none" className="flex flex-col gap-0.5">
                {group.items.map(({ result, index }) => (
                  <li key={result.id} role="none">
                    <SpotifySearchRow
                      id={optionId(index)}
                      result={result}
                      active={index === active}
                      queueing={queueingId === result.id}
                      queued={queuedIds.has(result.id)}
                      onActivate={() => setActive(index)}
                      onPick={() => pick(result)}
                      onAddToQueue={() => addToQueue(result)}
                    />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </ExpandingSearch>
  );
}
