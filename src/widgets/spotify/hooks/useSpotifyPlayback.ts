import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSpotifyDevices,
  getSpotifyPlaybackState,
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
} from "@/widgets/spotify/types";
import { useSpotifyStore } from "@/widgets/spotify/useSpotifyStore";
import { refreshScheduler } from "@/widgets/core/refreshScheduler";

const RESTART_THRESHOLD_MS = 3_000;
const PLAYING_POLL_MS = 10_000;
const IDLE_POLL_MS = 20_000;
const FOLLOW_UP_REFRESH_DELAYS_MS = [350, 1100, 2600, 5200];

export function useSpotifyPlayback(connected: boolean) {
  const [playback, setPlayback] = useState<SpotifyPlaybackState | null>(null);
  const [devices, setDevices] = useState<SpotifyPlaybackDevice[]>([]);
  const [pendingActions, setPendingActions] = useState<Set<SpotifyPendingAction>>(() => new Set());
  const [volumeDraft, setVolumeDraft] = useState<number | null>(null);
  const [progressDraftMs, setProgressDraftMs] = useState<number | null>(null);
  const [playbackSyncedAt, setPlaybackSyncedAt] = useState(() => Date.now());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const pendingActionsRef = useRef<Set<SpotifyPendingAction>>(new Set());
  const isVolumeEditingRef = useRef(false);
  const refreshRequestIdRef = useRef(0);
  const rateLimitedUntilRef = useRef(0);
  const lastPolledAtRef = useRef(0);

  const refreshNonce = useSpotifyStore((s) => s.refreshNonce);

  const refreshPlayback = useCallback(async () => {
    if (Date.now() < rateLimitedUntilRef.current) return;
    const requestId = refreshRequestIdRef.current + 1;
    refreshRequestIdRef.current = requestId;

    try {
      setError(null);
      const nextPlayback = await getSpotifyPlaybackState();

      if (requestId !== refreshRequestIdRef.current) return;

      setPlayback(nextPlayback);
      if (!isVolumeEditingRef.current) {
        setVolumeDraft(nextPlayback?.device.volumePercent ?? null);
      }
      const syncedNow = Date.now();
      setPlaybackSyncedAt(syncedNow);
      setNowMs(syncedNow);
      lastPolledAtRef.current = syncedNow;
    } catch (caught) {
      if (requestId !== refreshRequestIdRef.current) return;
      if (caught instanceof SpotifyRateLimitError) {
        rateLimitedUntilRef.current = Date.now() + caught.retryAfterMs;
      } else {
        setError(caught instanceof Error ? caught.message : "Unable to load Spotify playback");
      }
    } finally {
      if (requestId === refreshRequestIdRef.current) setIsLoading(false);
    }
  }, []);

  const loadDevices = useCallback(async () => {
    if (Date.now() < rateLimitedUntilRef.current) return;
    try {
      setDevices(await getSpotifyDevices());
    } catch (caught) {
      if (caught instanceof SpotifyRateLimitError) {
        rateLimitedUntilRef.current = Date.now() + caught.retryAfterMs;
      }
    }
  }, []);

  useEffect(() => {
    if (!connected) return;
    const timeoutId = window.setTimeout(() => void refreshPlayback(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [connected, refreshPlayback]);

  useEffect(() => {
    if (!connected || refreshNonce === 0) return;
    const timers = [400, 1400].map((delay) =>
      window.setTimeout(() => void refreshPlayback(), delay),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [refreshNonce, connected, refreshPlayback]);

  const pollIntervalMs = playback?.isPlaying ? PLAYING_POLL_MS : IDLE_POLL_MS;
  useEffect(() => {
    if (!connected) return;
    return refreshScheduler.register({
      id: "spotify:playback",
      staleMs: pollIntervalMs,
      pollIntervalMs,
      getLastRefreshedAt: () => lastPolledAtRef.current,
      refresh: () => void refreshPlayback(),
    });
  }, [connected, pollIntervalMs, refreshPlayback]);

  useEffect(() => {
    if (!playback?.isPlaying) return;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [playback?.isPlaying]);

  useEffect(() => {
    if (!playback?.isPlaying) return;
    const remaining = playback.track.durationMs - playback.progressMs;
    const untilEnd = remaining - (Date.now() - playbackSyncedAt) + 1000;
    if (untilEnd <= 0 || untilEnd > 0x7fffffff) return;
    const timeoutId = window.setTimeout(() => {
      if (document.visibilityState === "visible") void refreshPlayback();
    }, untilEnd);
    return () => window.clearTimeout(timeoutId);
  }, [
    playback?.isPlaying,
    playback?.track.id,
    playback?.track.durationMs,
    playback?.progressMs,
    playbackSyncedAt,
    refreshPlayback,
  ]);

  const setPendingAction = (action: SpotifyPendingAction, isPending: boolean) => {
    const next = new Set(pendingActionsRef.current);
    if (isPending) next.add(action);
    else next.delete(action);
    pendingActionsRef.current = next;
    setPendingActions(next);
  };

  const scheduleFollowUpRefresh = () => {
    FOLLOW_UP_REFRESH_DELAYS_MS.forEach((delayMs) => {
      window.setTimeout(() => void refreshPlayback(), delayMs);
    });
  };

  const runPlaybackAction = async (
    action: () => Promise<void>,
    afterAction?: () => void,
    pendingAction?: SpotifyPendingAction,
  ) => {
    if (pendingAction && pendingActionsRef.current.has(pendingAction)) return;

    try {
      if (pendingAction) setPendingAction(pendingAction, true);
      setError(null);
      await action();
      afterAction?.();
      scheduleFollowUpRefresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to control Spotify playback");
    } finally {
      if (pendingAction) setPendingAction(pendingAction, false);
    }
  };

  const getDisplayedProgressMs = (): number => {
    if (!playback) return 0;
    const elapsed = playback.isPlaying ? nowMs - playbackSyncedAt : 0;
    return Math.min(playback.track.durationMs, Math.max(0, playback.progressMs + elapsed));
  };

  const markSyncedNow = () => {
    const syncedNow = Date.now();
    setPlaybackSyncedAt(syncedNow);
    setNowMs(syncedNow);
  };

  const togglePlayback = () => {
    if (!playback) return;
    void runPlaybackAction(
      playback.isPlaying ? pauseSpotifyPlayback : resumeSpotifyPlayback,
      () => {
        setPlayback((current) => (current ? { ...current, isPlaying: !current.isPlaying } : current));
        markSyncedNow();
      },
      "playback",
    );
  };

  const previousTrack = () => {
    if (getDisplayedProgressMs() > RESTART_THRESHOLD_MS) {
      void runPlaybackAction(
        () => seekSpotifyPlayback(0),
        () => {
          setPlayback((current) => (current ? { ...current, progressMs: 0 } : current));
          markSyncedNow();
        },
        "previous",
      );
      return;
    }
    void runPlaybackAction(skipSpotifyPrevious, undefined, "previous");
  };

  const nextTrack = () => {
    void runPlaybackAction(skipSpotifyNext, undefined, "next");
  };

  const toggleShuffle = () => {
    if (!playback) return;
    const nextShuffle = !playback.shuffle;
    void runPlaybackAction(
      () => setSpotifyShuffle(nextShuffle),
      () => setPlayback((current) => (current ? { ...current, shuffle: nextShuffle } : current)),
      "shuffle",
    );
  };

  const cycleRepeat = () => {
    if (!playback) return;
    const currentIndex = SPOTIFY_REPEAT_MODES.indexOf(playback.repeatMode);
    const nextRepeatMode = SPOTIFY_REPEAT_MODES[(currentIndex + 1) % SPOTIFY_REPEAT_MODES.length] ?? "off";
    void runPlaybackAction(
      () => setSpotifyRepeatMode(nextRepeatMode),
      () => setPlayback((current) => (current ? { ...current, repeatMode: nextRepeatMode } : current)),
      "repeat",
    );
  };

  const changeVolume = (volumePercent: number) => {
    if (!playback) return;
    const nextVolume = Math.min(100, Math.max(0, Math.round(volumePercent)));
    isVolumeEditingRef.current = true;
    setVolumeDraft(nextVolume);
    setPlayback((current) =>
      current ? { ...current, device: { ...current.device, volumePercent: nextVolume } } : current,
    );
  };

  const commitVolume = () => {
    const nextVolume = volumeDraft ?? playback?.device.volumePercent;
    if (typeof nextVolume !== "number") return;
    isVolumeEditingRef.current = false;
    setVolumeDraft(null);
    void runPlaybackAction(() => setSpotifyVolume(nextVolume), undefined, "volume");
  };

  const changeProgress = (positionMs: number) => {
    if (!playback) return;
    const nextProgress = Math.min(playback.track.durationMs, Math.max(0, Math.round(positionMs)));
    setProgressDraftMs(nextProgress);
    setPlayback((current) => (current ? { ...current, progressMs: nextProgress } : current));
    markSyncedNow();
  };

  const commitProgress = () => {
    if (!playback || progressDraftMs === null) return;
    const nextProgress = progressDraftMs;
    setProgressDraftMs(null);
    void runPlaybackAction(() => seekSpotifyPlayback(nextProgress), undefined, "seek");
  };

  const transferDevice = (device: SpotifyPlaybackDevice) => {
    void runPlaybackAction(
      () => transferSpotifyPlayback(device.id),
      () => {
        setPlayback((current) =>
          current
            ? {
                ...current,
                device: {
                  ...device,
                  isActive: true,
                  volumePercent: device.volumePercent ?? current.device.volumePercent,
                },
              }
            : current,
        );
        setDevices((current) =>
          current.map((entry) => ({ ...entry, isActive: entry.id === device.id })),
        );
        void refreshPlayback();
      },
      "device",
    );
  };

  const refresh = async () => {
    if (pendingActionsRef.current.has("refresh")) return;
    try {
      setPendingAction("refresh", true);
      await refreshPlayback();
    } finally {
      setPendingAction("refresh", false);
    }
  };

  const displayedProgressMs = progressDraftMs ?? getDisplayedProgressMs();
  const volumePercent = volumeDraft ?? playback?.device.volumePercent ?? 100;
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
    pendingActions,
    error,
    isLoading,
    displayedProgressMs,
    volumePercent,
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

export type SpotifyPlaybackController = ReturnType<typeof useSpotifyPlayback>;
