import { useEffect } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  getSpotifyDevices,
  getSpotifyPlaybackState,
  getSpotifyQueue,
  pauseSpotifyPlayback,
  resumeSpotifyPlayback,
  seekSpotifyPlayback,
  setSpotifyRepeatMode,
  setSpotifyShuffle,
  setSpotifyVolume,
  skipSpotifyNext,
  skipSpotifyPrevious,
  SpotifyRateLimitError,
  transferSpotifyPlayback,
} from "@/widgets/spotify/lib/spotify-api";
import {
  SPOTIFY_REPEAT_MODES,
  type SpotifyPendingAction,
  type SpotifyPlaybackDevice,
  type SpotifyPlaybackState,
  type SpotifyQueueItem,
} from "@/widgets/spotify/types";
import { refreshScheduler } from "@/widgets/core/refreshScheduler";

const RESTART_THRESHOLD_MS = 3_000;
const PLAYING_POLL_MS = 10_000;
const IDLE_POLL_MS = 20_000;
const FOLLOW_UP_REFRESH_DELAYS_MS = [350, 1100, 2600, 5200];
const REQUEST_REFRESH_DELAYS_MS = [400, 1400];

type PlaybackStoreState = {
  playback: SpotifyPlaybackState | null;
  devices: SpotifyPlaybackDevice[];
  queue: SpotifyQueueItem[];
  queueLoading: boolean;
  queueError: string | null;
  pendingActions: Set<SpotifyPendingAction>;
  volumeDraft: number | null;
  progressDraftMs: number | null;
  playbackSyncedAt: number;
  nowMs: number;
  error: string | null;
  isLoading: boolean;
};

function initialState(): PlaybackStoreState {
  return {
    playback: null,
    devices: [],
    queue: [],
    queueLoading: false,
    queueError: null,
    pendingActions: new Set(),
    volumeDraft: null,
    progressDraftMs: null,
    playbackSyncedAt: Date.now(),
    nowMs: Date.now(),
    error: null,
    isLoading: true,
  };
}

export const useSpotifyPlaybackStore = create<PlaybackStoreState>(() => initialState());

const set = useSpotifyPlaybackStore.setState;
const get = useSpotifyPlaybackStore.getState;

let refCount = 0;
let connected = false;
let polling = false;
let isVolumeEditing = false;
let refreshRequestId = 0;
let rateLimitedUntil = 0;
let lastPolledAt = 0;
let currentPollMs = IDLE_POLL_MS;
let unregisterScheduler: (() => void) | null = null;
let tickIntervalId: ReturnType<typeof setInterval> | undefined;
let trackEndTimeoutId: ReturnType<typeof setTimeout> | undefined;
const followUpTimeouts = new Set<ReturnType<typeof setTimeout>>();

function scheduleRefreshBursts(delays: readonly number[]): void {
  delays.forEach((delayMs) => {
    const id = setTimeout(() => {
      followUpTimeouts.delete(id);
      void refreshPlayback();
    }, delayMs);
    followUpTimeouts.add(id);
  });
}

function clearFollowUpTimeouts(): void {
  for (const id of followUpTimeouts) clearTimeout(id);
  followUpTimeouts.clear();
}

function setPendingAction(action: SpotifyPendingAction, isPending: boolean): void {
  const next = new Set(get().pendingActions);
  if (isPending) next.add(action);
  else next.delete(action);
  set({ pendingActions: next });
}

function markSyncedNow(): void {
  const syncedNow = Date.now();
  set({ playbackSyncedAt: syncedNow, nowMs: syncedNow });
}

function reconcileTimers(): void {
  const { playback, playbackSyncedAt } = get();
  const desiredPollMs = playback?.isPlaying ? PLAYING_POLL_MS : IDLE_POLL_MS;
  if (polling && desiredPollMs !== currentPollMs) {
    currentPollMs = desiredPollMs;
    registerScheduler();
  }
  if (trackEndTimeoutId) {
    clearTimeout(trackEndTimeoutId);
    trackEndTimeoutId = undefined;
  }
  if (polling && playback?.isPlaying) {
    const remaining = playback.track.durationMs - playback.progressMs;
    const untilEnd = remaining - (Date.now() - playbackSyncedAt) + 1000;
    if (untilEnd > 0 && untilEnd <= 0x7fffffff) {
      trackEndTimeoutId = setTimeout(() => {
        if (document.visibilityState === "visible") void refreshPlayback();
      }, untilEnd);
    }
  }
}

async function refreshPlayback(): Promise<void> {
  if (Date.now() < rateLimitedUntil) return;
  const requestId = refreshRequestId + 1;
  refreshRequestId = requestId;

  try {
    set({ error: null });
    const nextPlayback = await getSpotifyPlaybackState();
    if (requestId !== refreshRequestId) return;

    set({ playback: nextPlayback });
    if (!isVolumeEditing) set({ volumeDraft: nextPlayback?.device.volumePercent ?? null });
    markSyncedNow();
    lastPolledAt = Date.now();
    reconcileTimers();
  } catch (caught) {
    if (requestId !== refreshRequestId) return;
    if (caught instanceof SpotifyRateLimitError) {
      rateLimitedUntil = Date.now() + caught.retryAfterMs;
    } else {
      set({ error: caught instanceof Error ? caught.message : "Unable to load Spotify playback" });
    }
  } finally {
    if (requestId === refreshRequestId) set({ isLoading: false });
  }
}

async function loadDevices(): Promise<void> {
  if (Date.now() < rateLimitedUntil) return;
  try {
    set({ devices: await getSpotifyDevices() });
  } catch (caught) {
    if (caught instanceof SpotifyRateLimitError) {
      rateLimitedUntil = Date.now() + caught.retryAfterMs;
    }
  }
}

export async function loadSpotifyQueue(): Promise<void> {
  if (Date.now() < rateLimitedUntil) return;
  set({ queueLoading: true, queueError: null });
  try {
    set({ queue: await getSpotifyQueue() });
  } catch (caught) {
    if (caught instanceof SpotifyRateLimitError) {
      rateLimitedUntil = Date.now() + caught.retryAfterMs;
      set({ queueError: "Spotify is busy — try again in a moment." });
    } else {
      set({ queueError: caught instanceof Error ? caught.message : "Unable to load the queue." });
    }
  } finally {
    set({ queueLoading: false });
  }
}

function scheduleFollowUpRefresh(): void {
  scheduleRefreshBursts(FOLLOW_UP_REFRESH_DELAYS_MS);
}

async function runPlaybackAction(
  action: () => Promise<void>,
  afterAction?: () => void,
  pendingAction?: SpotifyPendingAction,
): Promise<void> {
  if (pendingAction && get().pendingActions.has(pendingAction)) return;
  try {
    if (pendingAction) setPendingAction(pendingAction, true);
    set({ error: null });
    await action();
    afterAction?.();
    scheduleFollowUpRefresh();
  } catch (caught) {
    set({ error: caught instanceof Error ? caught.message : "Unable to control Spotify playback" });
  } finally {
    if (pendingAction) setPendingAction(pendingAction, false);
  }
}

type ProgressInputs = Pick<
  PlaybackStoreState,
  "progressDraftMs" | "playback" | "nowMs" | "playbackSyncedAt"
>;

function displayedProgressMs(state: ProgressInputs): number {
  if (state.progressDraftMs !== null) return state.progressDraftMs;
  const { playback } = state;
  if (!playback) return 0;
  const elapsed = playback.isPlaying ? state.nowMs - state.playbackSyncedAt : 0;
  return Math.min(playback.track.durationMs, Math.max(0, playback.progressMs + elapsed));
}

function getDisplayedProgressMs(): number {
  const { playback, nowMs, playbackSyncedAt } = get();
  if (!playback) return 0;
  const elapsed = playback.isPlaying ? nowMs - playbackSyncedAt : 0;
  return Math.min(playback.track.durationMs, Math.max(0, playback.progressMs + elapsed));
}

function togglePlayback(): void {
  const { playback } = get();
  if (!playback) return;
  void runPlaybackAction(
    playback.isPlaying ? pauseSpotifyPlayback : resumeSpotifyPlayback,
    () => {
      set((state) =>
        state.playback ? { playback: { ...state.playback, isPlaying: !state.playback.isPlaying } } : state,
      );
      markSyncedNow();
    },
    "playback",
  );
}

function previousTrack(): void {
  if (getDisplayedProgressMs() > RESTART_THRESHOLD_MS) {
    void runPlaybackAction(
      () => seekSpotifyPlayback(0),
      () => {
        set((state) => (state.playback ? { playback: { ...state.playback, progressMs: 0 } } : state));
        markSyncedNow();
      },
      "previous",
    );
    return;
  }
  void runPlaybackAction(skipSpotifyPrevious, undefined, "previous");
}

function nextTrack(): void {
  void runPlaybackAction(skipSpotifyNext, undefined, "next");
}

function toggleShuffle(): void {
  const { playback } = get();
  if (!playback) return;
  const nextShuffle = !playback.shuffle;
  void runPlaybackAction(
    () => setSpotifyShuffle(nextShuffle),
    () => set((state) => (state.playback ? { playback: { ...state.playback, shuffle: nextShuffle } } : state)),
    "shuffle",
  );
}

function cycleRepeat(): void {
  const { playback } = get();
  if (!playback) return;
  const currentIndex = SPOTIFY_REPEAT_MODES.indexOf(playback.repeatMode);
  const nextRepeatMode =
    SPOTIFY_REPEAT_MODES[(currentIndex + 1) % SPOTIFY_REPEAT_MODES.length] ?? "off";
  void runPlaybackAction(
    () => setSpotifyRepeatMode(nextRepeatMode),
    () =>
      set((state) =>
        state.playback ? { playback: { ...state.playback, repeatMode: nextRepeatMode } } : state,
      ),
    "repeat",
  );
}

function changeVolume(volumePercent: number): void {
  const { playback } = get();
  if (!playback) return;
  const nextVolume = Math.min(100, Math.max(0, Math.round(volumePercent)));
  isVolumeEditing = true;
  set((state) => ({
    volumeDraft: nextVolume,
    playback: state.playback
      ? { ...state.playback, device: { ...state.playback.device, volumePercent: nextVolume } }
      : state.playback,
  }));
}

function commitVolume(): void {
  const { volumeDraft, playback } = get();
  const nextVolume = volumeDraft ?? playback?.device.volumePercent;
  if (typeof nextVolume !== "number") return;
  isVolumeEditing = false;
  set({ volumeDraft: null });
  void runPlaybackAction(() => setSpotifyVolume(nextVolume), undefined, "volume");
}

function changeProgress(positionMs: number): void {
  const { playback } = get();
  if (!playback) return;
  const nextProgress = Math.min(playback.track.durationMs, Math.max(0, Math.round(positionMs)));
  set((state) => ({
    progressDraftMs: nextProgress,
    playback: state.playback ? { ...state.playback, progressMs: nextProgress } : state.playback,
  }));
  markSyncedNow();
}

function commitProgress(): void {
  const { progressDraftMs } = get();
  if (get().playback === null || progressDraftMs === null) return;
  set({ progressDraftMs: null });
  void runPlaybackAction(() => seekSpotifyPlayback(progressDraftMs), undefined, "seek");
}

function transferDevice(device: SpotifyPlaybackDevice): void {
  void runPlaybackAction(
    () => transferSpotifyPlayback(device.id),
    () => {
      set((state) => ({
        playback: state.playback
          ? {
              ...state.playback,
              device: {
                ...device,
                isActive: true,
                volumePercent: device.volumePercent ?? state.playback.device.volumePercent,
              },
            }
          : state.playback,
        devices: state.devices.map((entry) => ({ ...entry, isActive: entry.id === device.id })),
      }));
      void refreshPlayback();
    },
    "device",
  );
}

async function refresh(): Promise<void> {
  if (get().pendingActions.has("refresh")) return;
  try {
    setPendingAction("refresh", true);
    await refreshPlayback();
  } finally {
    setPendingAction("refresh", false);
  }
}

export function requestSpotifyPlaybackRefresh(): void {
  scheduleRefreshBursts(REQUEST_REFRESH_DELAYS_MS);
}

function registerScheduler(): void {
  unregisterScheduler?.();
  unregisterScheduler = refreshScheduler.register({
    id: "spotify:playback",
    staleMs: currentPollMs,
    pollIntervalMs: currentPollMs,
    getLastRefreshedAt: () => lastPolledAt,
    refresh: () => void refreshPlayback(),
  });
}

function startPolling(): void {
  if (polling) return;
  polling = true;
  currentPollMs = get().playback?.isPlaying ? PLAYING_POLL_MS : IDLE_POLL_MS;
  registerScheduler();
  tickIntervalId = setInterval(() => {
    if (document.visibilityState === "visible" && get().playback?.isPlaying) {
      set({ nowMs: Date.now() });
    }
  }, 1000);
  void refreshPlayback();
}

function stopPolling(): void {
  if (!polling) return;
  polling = false;
  unregisterScheduler?.();
  unregisterScheduler = null;
  if (tickIntervalId) {
    clearInterval(tickIntervalId);
    tickIntervalId = undefined;
  }
  if (trackEndTimeoutId) {
    clearTimeout(trackEndTimeoutId);
    trackEndTimeoutId = undefined;
  }
  clearFollowUpTimeouts();
}

function syncEngine(): void {
  if (refCount > 0 && connected) startPolling();
  else stopPolling();
}

function acquireEngine(): void {
  refCount += 1;
  syncEngine();
}

function releaseEngine(): void {
  refCount = Math.max(0, refCount - 1);
  syncEngine();
}

function setConnected(next: boolean): void {
  if (next === connected) return;
  connected = next;
  if (connected) set({ isLoading: true });
  syncEngine();
}

export type SpotifyPlaybackController = {
  playback: SpotifyPlaybackState | null;
  deviceOptions: SpotifyPlaybackDevice[];
  pendingActions: Set<SpotifyPendingAction>;
  error: string | null;
  isLoading: boolean;
  displayedProgressMs: number;
  volumePercent: number;
  restartThresholdMs: number;
  togglePlayback: () => void;
  previousTrack: () => void;
  nextTrack: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  changeVolume: (volumePercent: number) => void;
  commitVolume: () => void;
  changeProgress: (positionMs: number) => void;
  commitProgress: () => void;
  transferDevice: (device: SpotifyPlaybackDevice) => void;
  loadDevices: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function useSpotifyPlayback(connectedArg: boolean): SpotifyPlaybackController {
  useEffect(() => {
    acquireEngine();
    return () => releaseEngine();
  }, []);

  useEffect(() => {
    setConnected(connectedArg);
  }, [connectedArg]);

  const state = useSpotifyPlaybackStore(
    useShallow((s) => ({
      playback: s.playback,
      devices: s.devices,
      pendingActions: s.pendingActions,
      error: s.error,
      isLoading: s.isLoading,
      volumeDraft: s.volumeDraft,
      progressDraftMs: s.progressDraftMs,
      nowMs: s.nowMs,
      playbackSyncedAt: s.playbackSyncedAt,
    })),
  );
  const { playback, devices } = state;

  const deviceOptions =
    playback && !devices.some((device) => device.id === playback.device.id)
      ? [playback.device, ...devices]
      : devices.length
        ? devices
        : playback
          ? [playback.device]
          : [];

  return {
    playback,
    deviceOptions,
    pendingActions: state.pendingActions,
    error: state.error,
    isLoading: state.isLoading,
    displayedProgressMs: displayedProgressMs(state),
    volumePercent: state.volumeDraft ?? playback?.device.volumePercent ?? 100,
    restartThresholdMs: RESTART_THRESHOLD_MS,
    togglePlayback,
    previousTrack,
    nextTrack,
    toggleShuffle,
    cycleRepeat,
    changeVolume,
    commitVolume,
    changeProgress,
    commitProgress,
    transferDevice,
    loadDevices,
    refresh,
  };
}
