import { useEffect, useMemo, useState } from "react";
import { ExpandingSearch } from "@/components/ExpandingSearch";
import { useComboboxCursor } from "@/hooks/useComboboxCursor";
import { SpotifyDeviceChooser } from "@/widgets/spotify/components/SpotifyDeviceChooser";
import { SpotifySearchRow } from "@/widgets/spotify/components/SpotifySearchRow";
import { useSpotifySearchResults } from "@/widgets/spotify/hooks/useSpotifySearchResults";
import {
  addSpotifyToQueue,
  SpotifyRequestError,
  startSpotifyPlayback,
} from "@/widgets/spotify/lib/spotify-api";
import { type SpotifyPlaybackDevice, type SpotifySearchResult } from "@/widgets/spotify/types";
import { NO_DEVICE_MESSAGE, resolveSpotifyDevice } from "@/widgets/spotify/lib/devices";
import {
  loadSpotifyQueue,
  requestSpotifyPlaybackRefresh,
  spotifyDevices,
} from "@/widgets/spotify/hooks/useSpotifyPlayback";
import { ListboxStatus } from "@/components/ListboxStatus";
import { cn, matchesQuery } from "@/lib/utils";
import { TYPE } from "@/lib/type";
import { reportWriteFailure } from "@/widgets/core/reportWriteFailure";

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

function reportFailure(caught: unknown, fallback: string): void {
  reportWriteFailure(
    "spotify-write",
    caught,
    caught instanceof SpotifyRequestError ? caught.message : fallback,
  );
}

export function SpotifySearch() {
  const [open, setOpen] = useState(false);
  const { query, setQuery, state, results, playlists, playlistsLoading } =
    useSpotifySearchResults(open);
  const error = state.status === "error" ? "Couldn't search Spotify." : null;
  const [devices, setDevices] = useState<SpotifyPlaybackDevice[]>([]);
  const [devicesError, setDevicesError] = useState<string | null>(null);
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
    spotifyDevices()
      .then((found) => {
        if (cancelled) return;
        setDevices(found);
        setDevicesError(null);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setDevices([]);
        setDevicesError(
          caught instanceof SpotifyRequestError ? caught.message : "Couldn't load your devices.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const targetDevice =
    devices.find((device) => device.id === targetDeviceId) ?? resolveSpotifyDevice(devices);

  const deviceForAction = async (): Promise<SpotifyPlaybackDevice> => {
    if (targetDevice) return targetDevice;
    const found = await spotifyDevices();
    setDevices(found);
    setDevicesError(null);
    const device = resolveSpotifyDevice(found);
    if (device) return device;
    throw new SpotifyRequestError(
      "noDevice",
      found.length === 0 ? NO_DEVICE_MESSAGE : "Choose a device to play on.",
    );
  };

  const pick = (result: SpotifySearchResult) => {
    deviceForAction()
      .then((device) => startSpotifyPlayback(result, device.id))
      .then(() => {
        requestSpotifyPlaybackRefresh();
        setQuery("");
        setOpen(false);
      })
      .catch((caught: unknown) => reportFailure(caught, "Couldn't start playback."));
  };

  const addToQueue = (result: SpotifySearchResult) => {
    if (queueingId === result.id || queuedIds.has(result.id)) return;
    setQueueingId(result.id);
    deviceForAction()
      .then((device) => addSpotifyToQueue(result.uri, device.id))
      .then(() => {
        void loadSpotifyQueue();
        setQueuedIds((prev) => new Set(prev).add(result.id));
      })
      .catch((caught: unknown) => reportFailure(caught, "Couldn't add to queue."))
      .finally(() => setQueueingId(null));
  };

  const trimmed = query.trim();
  const isSearch = trimmed.length >= MIN_QUERY_LENGTH;
  const rows = useMemo(() => {
    if (!isSearch) return playlists.slice(0, MAX_RESULTS);
    const owned = playlists
      .filter((playlist) => matchesQuery(playlist.title, trimmed))
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
        error={devicesError}
        needsChoice={needsDeviceChoice}
        onSelect={setTargetDeviceId}
      />
      {error ? (
        <ListboxStatus>{error}</ListboxStatus>
      ) : isSearch && state.status === "loading" && rows.length === 0 ? (
        <ListboxStatus>Searching…</ListboxStatus>
      ) : isSearch && rows.length === 0 ? (
        <ListboxStatus>No matching results.</ListboxStatus>
      ) : rows.length === 0 ? (
        <ListboxStatus>
          {playlistsLoading ? "Loading your playlists…" : "Search songs, albums, and playlists."}
        </ListboxStatus>
      ) : (
        <ul role="listbox" id={listboxId} aria-label="Search results" className="flex flex-col">
          {groups.map((group) => (
            <li key={group.key} role="group" aria-label={group.label}>
              <p aria-hidden className={cn(TYPE.eyebrow, "px-2 pt-2 pb-1")}>
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
