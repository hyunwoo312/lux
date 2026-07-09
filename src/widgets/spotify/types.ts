import type { AccentPreset } from "@/widgets/core/accent";

export const SPOTIFY_ACCENT: AccentPreset = "green";

export const SPOTIFY_REPEAT_MODES = ["off", "context", "track"] as const;
export type SpotifyRepeatMode = (typeof SPOTIFY_REPEAT_MODES)[number];

export const SPOTIFY_TIME_DISPLAY_MODES = ["total", "remaining"] as const;
export type SpotifyTimeDisplayMode = (typeof SPOTIFY_TIME_DISPLAY_MODES)[number];

export type SpotifyPlaybackTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl?: string;
  durationMs: number;
};

export type SpotifyPlaybackDevice = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  volumePercent: number | null;
};

export type SpotifyPlaybackState = {
  isPlaying: boolean;
  progressMs: number;
  shuffle: boolean;
  repeatMode: SpotifyRepeatMode;
  device: SpotifyPlaybackDevice;
  track: SpotifyPlaybackTrack;
};

export type SpotifyQueueItem = {
  id: string;
  uri: string;
  title: string;
  subtitle: string;
  artworkUrl?: string;
};

export type SpotifySearchKind = "track" | "album" | "playlist";

export type SpotifySearchResult = {
  id: string;
  uri: string;
  kind: SpotifySearchKind;
  title: string;
  subtitle: string;
  artworkUrl?: string;
  liked?: boolean;
  mine?: boolean;
};

export type SpotifyResponsiveView = "compact" | "details" | "expanded";

export type SpotifyPendingAction =
  | "playback"
  | "previous"
  | "next"
  | "shuffle"
  | "repeat"
  | "seek"
  | "volume"
  | "device"
  | "refresh";
