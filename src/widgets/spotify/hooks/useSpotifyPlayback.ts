import { useEffect } from "react";
import {
  createLatestOnly,
  createSerialQueue,
  type QueuedRunner,
} from "@/widgets/spotify/lib/actionQueue";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  getSpotifyContextName,
  getSpotifyDevices,
  getSpotifyPlaybackState,
  getSpotifyQueue,
  getSpotifySavedTrackFlags,
  pauseSpotifyPlayback,
  resumeSpotifyPlayback,
  seekSpotifyPlayback,
  setSpotifyRepeatMode,
  setSpotifyShuffle,
  setSpotifyVolume,
  startSpotifyPlayback,
  skipSpotifyNext,
  skipSpotifyPrevious,
  SpotifyRequestError,
  transferSpotifyPlayback,
} from "@/widgets/spotify/lib/spotify-api";
import { RateLimitError } from "@/lib/net";
import {
  SPOTIFY_REPEAT_MODES,
  type SpotifyPendingAction,
  type SpotifyPlaybackContext,
  type SpotifyPlaybackDevice,
  type SpotifySearchResult,
  type SpotifyPlaybackError,
  type SpotifyPlaybackState,
  type SpotifyQueueItem,
} from "@/widgets/spotify/types";
import { refreshScheduler } from "@/widgets/core/refreshScheduler";
import { anySpotifyDevice } from "@/widgets/spotify/lib/devices";

const RESTART_THRESHOLD_MS = 3_000;
const PLAYING_POLL_MS = 10_000;
const IDLE_POLL_MS = 20_000;
const FOLLOW_UP_REFRESH_DELAYS_MS = [350, 1100, 2600, 5200];
const REQUEST_REFRESH_DELAYS_MS = [0, 800, 2000];

type PlaybackStoreState = {
  playback: SpotifyPlaybackState | null;
  devices: SpotifyPlaybackDevice[];
  devicesLoading: boolean;
  devicesError: string | null;
  queue: SpotifyQueueItem[];
  queueLoading: boolean;
  queueError: string | null;
  pendingActions: Set<SpotifyPendingAction>;
  volumeDraft: number | null;
  progressDraftMs: number | null;
  playbackSyncedAt: number;
  nowMs: number;
  likedTrack: { trackId: string; isLiked: boolean } | null;
  contextLabel: { uri: string; name: string | null } | null;
  error: SpotifyPlaybackError | null;
  isLoading: boolean;
};

function playbackError(caught: unknown, fallback: string): SpotifyPlaybackError {
  if (caught instanceof SpotifyRequestError) return { kind: caught.kind, message: caught.message };
  return { kind: "unknown", message: caught instanceof Error ? caught.message : fallback };
}

function initialState(): PlaybackStoreState {
  return {
    playback: null,
    devices: [],
    devicesLoading: false,
    devicesError: null,
    queue: [],
    queueLoading: false,
    queueError: null,
    pendingActions: new Set(),
    volumeDraft: null,
    progressDraftMs: null,
    playbackSyncedAt: Date.now(),
    nowMs: Date.now(),
    likedTrack: null,
    contextLabel: null,
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
let lastPolledAt = 0;
let currentPollMs = IDLE_POLL_MS;
let unregisterScheduler: (() => void) | null = null;
let tickIntervalId: ReturnType<typeof setInterval> | undefined;
let trackEndTimeoutId: ReturnType<typeof setTimeout> | undefined;
const followUpTimeouts = new Set<ReturnType<typeof setTimeout>>();

function scheduleRefreshBursts(delays: readonly number[]): void {
  clearFollowUpTimeouts();
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
    void refreshLikedTrack(nextPlayback?.track.id ?? null);
    void refreshContextName(nextPlayback?.context ?? null);
  } catch (caught) {
    if (requestId !== refreshRequestId) return;
    if (!(caught instanceof RateLimitError)) {
      set({ error: playbackError(caught, "Unable to load Spotify playback") });
    }
  } finally {
    if (requestId === refreshRequestId) set({ isLoading: false });
  }
}

async function refreshLikedTrack(trackId: string | null): Promise<void> {
  if (trackId === null) {
    if (get().likedTrack !== null) set({ likedTrack: null });
    return;
  }
  if (get().likedTrack?.trackId === trackId) return;
  try {
    const liked = await getSpotifySavedTrackFlags([trackId]);
    if (get().playback?.track.id !== trackId) return;
    set({ likedTrack: { trackId, isLiked: liked.has(trackId) } });
  } catch {
    set({ likedTrack: { trackId, isLiked: false } });
  }
}

async function refreshContextName(context: SpotifyPlaybackContext | null): Promise<void> {
  if (context === null) {
    if (get().contextLabel !== null) set({ contextLabel: null });
    return;
  }
  if (get().contextLabel?.uri === context.uri) return;
  try {
    const name = await getSpotifyContextName(context);
    if (get().playback?.context?.uri !== context.uri) return;
    set({ contextLabel: { uri: context.uri, name } });
  } catch {
    set({ contextLabel: { uri: context.uri, name: null } });
  }
}

async function loadDevices(): Promise<void> {
  set({ devicesLoading: true, devicesError: null });
  try {
    set({ devices: await getSpotifyDevices() });
  } catch (caught) {
    if (caught instanceof RateLimitError) {
      set({ devicesError: "Spotify is busy — try again in a moment." });
    } else {
      set({ devicesError: caught instanceof Error ? caught.message : "Unable to load devices." });
    }
  } finally {
    set({ devicesLoading: false });
  }
}

export async function loadSpotifyQueue(): Promise<void> {
  set({ queueLoading: true, queueError: null });
  try {
    set({ queue: await getSpotifyQueue() });
  } catch (caught) {
    if (caught instanceof RateLimitError) {
      set({ queueError: "Spotify is busy — try again in a moment." });
    } else {
      set({ queueError: caught instanceof Error ? caught.message : "Unable to load the queue." });
    }
  } finally {
    set({ queueLoading: false });
  }
}

const NO_DEVICE_MESSAGE = "Open Spotify on a device first, then try again.";

const NOTHING_QUEUED_MESSAGE = "Spotify has nothing queued — play something first.";

const DEVICES_TTL_MS = 30_000;

let devicesLoadedAt = 0;

const skipQueue = createSerialQueue();
const latestQueues = new Map<SpotifyPendingAction, QueuedRunner>();

function queueFor(pendingAction: SpotifyPendingAction): QueuedRunner {
  if (pendingAction === "next" || pendingAction === "previous") return skipQueue;
  const existing = latestQueues.get(pendingAction);
  if (existing) return existing;
  const created = createLatestOnly();
  latestQueues.set(pendingAction, created);
  return created;
}

function queuePlaybackAction(
  action: () => Promise<void>,
  afterAction: (() => void) | undefined,
  pendingAction: SpotifyPendingAction,
): void {
  queueFor(pendingAction)(() => runPlaybackAction(action, afterAction, pendingAction));
}

export function skipSpotifyAhead(steps: number): Promise<void> {
  return new Promise((resolve, reject) => {
    skipQueue(async () => {
      try {
        for (let step = 0; step < steps; step += 1) await skipSpotifyNext();
        resolve();
      } catch (caught) {
        reject(caught instanceof Error ? caught : new Error("Couldn't play that track."));
      }
    });
  });
}

async function runPlaybackAction(
  action: () => Promise<void>,
  afterAction: (() => void) | undefined,
  pendingAction: SpotifyPendingAction,
): Promise<void> {
  try {
    setPendingAction(pendingAction, true);
    set({ error: null });
    await action();
    afterAction?.();
    scheduleRefreshBursts(FOLLOW_UP_REFRESH_DELAYS_MS);
  } catch (caught) {
    set({ error: playbackError(caught, "Unable to control Spotify playback") });
  } finally {
    setPendingAction(pendingAction, false);
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

export function togglePlayback(): void {
  const { playback } = get();
  if (!playback) return;
  const shouldPlay = !playback.isPlaying;
  set({ playback: { ...playback, isPlaying: shouldPlay } });
  markSyncedNow();
  queuePlaybackAction(
    shouldPlay ? resumeSpotifyPlayback : pauseSpotifyPlayback,
    undefined,
    "playback",
  );
}

export function previousTrack(): void {
  if (displayedProgressMs(get()) > RESTART_THRESHOLD_MS) {
    queuePlaybackAction(
      () => seekSpotifyPlayback(0),
      () => {
        set((state) =>
          state.playback ? { playback: { ...state.playback, progressMs: 0 } } : state,
        );
        markSyncedNow();
      },
      "previous",
    );
    return;
  }
  queuePlaybackAction(skipSpotifyPrevious, undefined, "previous");
}

export function nextTrack(): void {
  queuePlaybackAction(skipSpotifyNext, undefined, "next");
}

export function toggleShuffle(): void {
  const { playback } = get();
  if (!playback) return;
  const nextShuffle = !playback.shuffle;
  set({ playback: { ...playback, shuffle: nextShuffle } });
  queuePlaybackAction(() => setSpotifyShuffle(nextShuffle), undefined, "shuffle");
}

export function cycleRepeat(): void {
  const { playback } = get();
  if (!playback) return;
  const currentIndex = SPOTIFY_REPEAT_MODES.indexOf(playback.repeatMode);
  const nextRepeatMode =
    SPOTIFY_REPEAT_MODES[(currentIndex + 1) % SPOTIFY_REPEAT_MODES.length] ?? "off";
  set({ playback: { ...playback, repeatMode: nextRepeatMode } });
  queuePlaybackAction(() => setSpotifyRepeatMode(nextRepeatMode), undefined, "repeat");
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
  queuePlaybackAction(() => setSpotifyVolume(nextVolume), undefined, "volume");
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
  queuePlaybackAction(() => seekSpotifyPlayback(progressDraftMs), undefined, "seek");
}

export function selectSpotifyDevice(device: SpotifyPlaybackDevice): void {
  queuePlaybackAction(
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

export async function playSpotifyResult(result: SpotifySearchResult): Promise<void> {
  if (get().devices.length === 0) await loadDevices();
  const target = anySpotifyDevice(get().devices);
  if (!target) throw new Error(NO_DEVICE_MESSAGE);
  await startSpotifyPlayback(result, target.id);
  requestSpotifyPlaybackRefresh();
}

export function setSpotifyVolumeTo(volumePercent: number): void {
  if (get().playback === null) throw new Error(NO_DEVICE_MESSAGE);
  changeVolume(volumePercent);
  commitVolume();
}

export function nudgeSpotifyVolume(delta: number): void {
  if (get().playback === null) throw new Error(NO_DEVICE_MESSAGE);
  const current = get().playback?.device.volumePercent;
  if (typeof current !== "number") throw new Error("That device doesn't report its volume.");
  setSpotifyVolumeTo(current + delta);
}

export async function spotifyDevices(): Promise<SpotifyPlaybackDevice[]> {
  const fresh = get().devices.length > 0 && Date.now() - devicesLoadedAt < DEVICES_TTL_MS;
  if (!fresh) {
    await loadDevices();
    devicesLoadedAt = Date.now();
  }
  const { devices, devicesError } = get();
  if (devicesError !== null) throw new Error(devicesError);
  return devices;
}

async function ensureSpotifyPlayback(): Promise<void> {
  if (get().playback) return;
  await refreshPlayback();
}

export async function ensureSpotifyTarget(): Promise<void> {
  await ensureSpotifyPlayback();
  if (get().playback) return;

  const target = anySpotifyDevice(await spotifyDevices());
  if (!target) throw new Error(NO_DEVICE_MESSAGE);
  if (!target.isActive) {
    await transferSpotifyPlayback(target.id);
    await refreshPlayback();
  }
  if (get().playback === null) throw new Error(NOTHING_QUEUED_MESSAGE);
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
  devicesLoading: boolean;
  devicesError: string | null;
  isTrackLiked: boolean;
  contextName: string | null;
  pendingActions: Set<SpotifyPendingAction>;
  error: SpotifyPlaybackError | null;
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
      devicesLoading: s.devicesLoading,
      devicesError: s.devicesError,
      pendingActions: s.pendingActions,
      error: s.error,
      isLoading: s.isLoading,
      volumeDraft: s.volumeDraft,
      progressDraftMs: s.progressDraftMs,
      nowMs: s.nowMs,
      playbackSyncedAt: s.playbackSyncedAt,
      likedTrack: s.likedTrack,
      contextLabel: s.contextLabel,
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
    devicesLoading: state.devicesLoading,
    devicesError: state.devicesError,
    isTrackLiked:
      playback !== null &&
      state.likedTrack?.trackId === playback.track.id &&
      state.likedTrack.isLiked,
    contextName:
      playback?.context && state.contextLabel?.uri === playback.context.uri
        ? state.contextLabel.name
        : null,
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
    transferDevice: selectSpotifyDevice,
    loadDevices,
    refresh,
  };
}
