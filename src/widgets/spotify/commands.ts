import { SpotifyServiceIcon } from "@/components/icons/service-icons";
import { matchesQuery } from "@/widgets/core/commandResult";
import { needsAccount } from "@/widgets/core/commandSetup";
import type { CommandResult, WidgetCommand } from "@/widgets/core/types";
import type { SpotifySearchKind, SpotifySearchResult } from "@/widgets/spotify/types";
import { searchSpotify } from "@/widgets/spotify/lib/spotify-api";
import { readPolled } from "@/widgets/core/usePolledResource";
import {
  spotifyAlbums,
  spotifyLikedTracks,
  spotifyPlaylists,
} from "@/widgets/spotify/lib/resources";
import {
  cycleRepeat,
  ensureSpotifyTarget,
  playSpotifyResult,
  nextTrack,
  nudgeSpotifyVolume,
  previousTrack,
  selectSpotifyDevice,
  setSpotifyVolumeTo,
  spotifyDevices,
  togglePlayback,
  toggleShuffle,
} from "@/widgets/spotify/hooks/useSpotifyPlayback";

const VOLUME_STEP = 10;

const VOLUME_PRESETS = [25, 50, 75, 100] as const;

const KIND_LABEL: Record<SpotifySearchResult["kind"], string> = {
  track: "Songs",
  album: "Albums",
  playlist: "Playlists",
};

function resultSection(result: SpotifySearchResult): string {
  return result.mine ? "Your playlists" : KIND_LABEL[result.kind];
}

function playbackRow(result: SpotifySearchResult): CommandResult {
  return {
    id: result.id,
    label: result.title,
    meta: result.subtitle,
    section: resultSection(result),
    artworkUrl: result.artworkUrl,
    run: () => playSpotifyResult(result),
  };
}

const LIBRARY_SECTIONS = [
  { label: "Playlists", resource: spotifyPlaylists },
  { label: "Albums", resource: spotifyAlbums },
  { label: "Liked songs", resource: spotifyLikedTracks },
] as const;

async function libraryRows(query: string): Promise<CommandResult[]> {
  const needle = query.trim();
  const loaded = await Promise.all(
    LIBRARY_SECTIONS.map(async (section) => {
      const results = await readPolled(section.resource).catch(() => []);
      return results
        .filter((result) => matchesQuery(`${result.title} ${result.subtitle}`, needle))
        .map((result) => ({ ...playbackRow(result), section: section.label }));
    }),
  );
  return loaded.flat();
}

const SEARCH_SCOPES = [
  { kind: "track", label: "Search songs", description: "Search Spotify for a song" },
  { kind: "album", label: "Search albums", description: "Search Spotify for an album" },
  { kind: "playlist", label: "Search playlists", description: "Search Spotify for a playlist" },
] as const satisfies readonly { kind: SpotifySearchKind; label: string; description: string }[];

const kindSearches: WidgetCommand[] = SEARCH_SCOPES.map(({ kind, label, description }) => ({
  kind: "provider",
  id: `spotify.search.${kind}`,
  label,
  description,
  icon: SpotifyServiceIcon,
  keywords: ["search", "spotify", "play"],
  placeholder: label,
  emptyMessage: (query) =>
    query === "" ? `Type to ${label.toLowerCase()}.` : `Nothing matched “${query}”.`,
  search: async (query, signal) => {
    const found =
      query === ""
        ? kind === "playlist"
          ? await readPolled(spotifyPlaylists)
          : []
        : await searchSpotify(query, signal, kind);
    return found.map(playbackRow);
  },
}));

const volumePresets: WidgetCommand[] = VOLUME_PRESETS.map((percent) => ({
  kind: "action",
  id: `spotify.volume${percent}`,
  label: `Set volume to ${percent}%`,
  description: `Set the volume to ${percent}%`,
  icon: SpotifyServiceIcon,
  keywords: ["volume", "loud", "quiet"],
  run: async () => {
    await ensureSpotifyTarget();
    setSpotifyVolumeTo(percent);
  },
}));

const spotifyAccount = () => needsAccount("spotify", "Spotify");

const COMMANDS: WidgetCommand[] = [
  {
    kind: "action",
    id: "spotify.playPause",
    label: "Toggle play/pause",
    description: "Play or pause the current track",
    icon: SpotifyServiceIcon,
    keywords: ["play", "pause", "resume", "stop", "music"],
    run: async () => {
      await ensureSpotifyTarget();
      togglePlayback();
    },
  },
  {
    kind: "provider",
    id: "spotify.search",
    label: "Search Spotify",
    description: "Find a track, album or playlist to play",
    icon: SpotifyServiceIcon,
    keywords: ["play", "track", "song", "album", "playlist", "music"],
    placeholder: "Search Spotify",
    emptyMessage: (query) =>
      query === "" ? "No playlists of your own yet." : `Nothing on Spotify matched “${query}”.`,
    search: async (query, signal) => {
      const found =
        query === "" ? await readPolled(spotifyPlaylists) : await searchSpotify(query, signal);
      return found.map(playbackRow);
    },
  },
  {
    kind: "action",
    id: "spotify.next",
    label: "Next",
    description: "Skip to the next track",
    icon: SpotifyServiceIcon,
    keywords: ["skip", "forward"],
    run: async () => {
      await ensureSpotifyTarget();
      nextTrack();
    },
  },
  {
    kind: "action",
    id: "spotify.previous",
    label: "Previous",
    description: "Go back to the previous track",
    icon: SpotifyServiceIcon,
    keywords: ["back", "rewind", "restart"],
    run: async () => {
      await ensureSpotifyTarget();
      previousTrack();
    },
  },
  {
    kind: "action",
    id: "spotify.shuffle",
    label: "Toggle shuffle",
    description: "Turn shuffle on or off",
    icon: SpotifyServiceIcon,
    keywords: ["random"],
    run: async () => {
      await ensureSpotifyTarget();
      toggleShuffle();
    },
  },
  {
    kind: "action",
    id: "spotify.repeat",
    label: "Toggle repeat",
    description: "Cycle repeat between off, all and one",
    icon: SpotifyServiceIcon,
    keywords: ["loop"],
    run: async () => {
      await ensureSpotifyTarget();
      cycleRepeat();
    },
  },
  {
    kind: "provider",
    id: "spotify.device",
    label: "Select device",
    description: "Move playback to another device",
    icon: SpotifyServiceIcon,
    keywords: ["speaker", "computer", "phone", "transfer", "connect"],
    placeholder: "Search devices",
    emptyMessage: () => "Open Spotify on a device first, then try again.",
    search: async (query) => {
      const needle = query.trim();
      return (await spotifyDevices())
        .filter((device) => matchesQuery(device.name, needle))
        .map((device) => ({
          id: device.id,
          label: device.name,
          meta: device.type,
          section: device.isActive ? "Playing here" : "Devices",
          run: () => selectSpotifyDevice(device),
        }));
    },
  },
  {
    kind: "action",
    id: "spotify.volumeUp",
    label: "Volume up",
    description: `Raise the volume by ${VOLUME_STEP}%`,
    icon: SpotifyServiceIcon,
    keywords: ["louder", "increase"],
    run: async () => {
      await ensureSpotifyTarget();
      nudgeSpotifyVolume(VOLUME_STEP);
    },
  },
  {
    kind: "action",
    id: "spotify.volumeDown",
    label: "Volume down",
    description: `Lower the volume by ${VOLUME_STEP}%`,
    icon: SpotifyServiceIcon,
    keywords: ["quieter", "decrease"],
    run: async () => {
      await ensureSpotifyTarget();
      nudgeSpotifyVolume(-VOLUME_STEP);
    },
  },
  {
    kind: "action",
    id: "spotify.mute",
    label: "Mute",
    description: "Set the volume to 0%",
    icon: SpotifyServiceIcon,
    keywords: ["silence", "volume"],
    run: async () => {
      await ensureSpotifyTarget();
      setSpotifyVolumeTo(0);
    },
  },
  {
    kind: "provider",
    id: "spotify.library",
    label: "My library",
    description: "Browse and search the playlists, albums and songs you have saved",
    icon: SpotifyServiceIcon,
    keywords: ["saved", "liked", "collection", "mine"],
    placeholder: "Search your library",
    emptyMessage: (query) =>
      query === ""
        ? "Nothing saved to your library yet."
        : `Nothing in your library matched “${query}”.`,
    search: (query) => libraryRows(query),
  },
  ...kindSearches,
  ...volumePresets,
];

export const spotifyCommands = (): WidgetCommand[] =>
  COMMANDS.map((command) => ({ ...command, setup: spotifyAccount }));
