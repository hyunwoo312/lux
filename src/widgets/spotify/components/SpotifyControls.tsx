import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpotifyDeviceMenu } from "@/widgets/spotify/components/SpotifyDeviceMenu";
import { SpotifyVolume } from "@/widgets/spotify/components/SpotifyVolume";
import type {
  SpotifyPendingAction,
  SpotifyPlaybackDevice,
  SpotifyPlaybackState,
} from "@/widgets/spotify/types";

const ACTIVE_TOGGLE = "text-primary hover:text-primary";

const CONTROL_BUTTON = `focus-ring text-ink-3 relative inline-flex items-center justify-center rounded-full
 transition-colors
 hover:text-ink
 disabled:pointer-events-none disabled:opacity-40
`;

type SpotifyControlsProps = {
  playback: SpotifyPlaybackState;
  pendingActions: Set<SpotifyPendingAction>;
  canRestart: boolean;
  showSideControls: boolean;
  compact?: boolean;
  deviceOptions: SpotifyPlaybackDevice[];
  devicesLoading: boolean;
  devicesError: string | null;
  volumePercent: number;
  onTogglePlayback: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onTransferDevice: (device: SpotifyPlaybackDevice) => void;
  onOpenDeviceMenu: () => void;
  onChangeVolume: (volumePercent: number) => void;
  onCommitVolume: () => void;
};

export function SpotifyControls({
  playback,
  pendingActions,
  canRestart,
  showSideControls,
  compact = false,
  deviceOptions,
  devicesLoading,
  devicesError,
  volumePercent,
  onTogglePlayback,
  onPrevious,
  onNext,
  onToggleShuffle,
  onCycleRepeat,
  onTransferDevice,
  onOpenDeviceMenu,
  onChangeVolume,
  onCommitVolume,
}: SpotifyControlsProps) {
  const size = compact ? "size-7" : "size-8";
  const play = compact ? "size-8" : "size-10";
  const glyph = compact ? "size-3.5" : "size-4";
  const playGlyph = compact ? "size-4" : "size-5";

  return (
    <div className="flex items-center justify-between gap-1">
      <div className={cn("flex justify-start", compact ? "w-0" : "w-8")}>
        {showSideControls && (
          <SpotifyDeviceMenu
            devices={deviceOptions}
            activeId={playback.device.id}
            disabled={pendingActions.has("device")}
            loading={devicesLoading}
            error={devicesError}
            onSelect={onTransferDevice}
            onOpen={onOpenDeviceMenu}
          />
        )}
      </div>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label={playback.shuffle ? "Disable shuffle" : "Enable shuffle"}
          aria-pressed={playback.shuffle}
          disabled={pendingActions.has("shuffle")}
          onClick={onToggleShuffle}
          className={cn(
            "press cursor-pointer",
            CONTROL_BUTTON,
            size,
            playback.shuffle && ACTIVE_TOGGLE,
          )}
        >
          <Shuffle className={glyph} aria-hidden />
          {playback.shuffle && <ActiveDot />}
        </button>
        <button
          type="button"
          aria-label={canRestart ? "Restart track" : "Previous track"}
          disabled={pendingActions.has("previous")}
          onClick={onPrevious}
          className={cn("press cursor-pointer", CONTROL_BUTTON, size)}
        >
          <SkipBack className={glyph} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={playback.isPlaying ? "Pause" : "Play"}
          disabled={pendingActions.has("playback")}
          onClick={onTogglePlayback}
          className={cn(
            `
              focus-ring text-ink inline-flex cursor-pointer items-center justify-center
              rounded-full transition-transform
              hover:scale-105
              active:scale-95
              disabled:pointer-events-none disabled:opacity-40
            `,
            play,
          )}
        >
          {playback.isPlaying ? (
            <Pause className={cn(playGlyph, "fill-current")} aria-hidden />
          ) : (
            <Play className={cn(playGlyph, "translate-x-px fill-current")} aria-hidden />
          )}
        </button>
        <button
          type="button"
          aria-label="Next track"
          disabled={pendingActions.has("next")}
          onClick={onNext}
          className={cn("press cursor-pointer", CONTROL_BUTTON, size)}
        >
          <SkipForward className={glyph} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={`Repeat ${playback.repeatMode}`}
          aria-pressed={playback.repeatMode !== "off"}
          disabled={pendingActions.has("repeat")}
          onClick={onCycleRepeat}
          className={cn(
            "press cursor-pointer",
            CONTROL_BUTTON,
            size,
            playback.repeatMode !== "off" && ACTIVE_TOGGLE,
          )}
        >
          {playback.repeatMode === "track" ? (
            <Repeat1 className={glyph} aria-hidden />
          ) : (
            <Repeat className={glyph} aria-hidden />
          )}
          {playback.repeatMode !== "off" && <ActiveDot />}
        </button>
      </div>

      <div className={cn("flex justify-end", compact ? "w-0" : "w-8")}>
        {showSideControls && (
          <SpotifyVolume
            volumePercent={volumePercent}
            onChange={onChangeVolume}
            onCommit={onCommitVolume}
          />
        )}
      </div>
    </div>
  );
}

function ActiveDot() {
  return (
    <span
      aria-hidden
      className="bg-primary absolute bottom-0 left-1/2 size-1 -translate-x-1/2 rounded-full"
    />
  );
}
