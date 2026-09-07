import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpotifyDeviceMenu } from "@/widgets/spotify/components/SpotifyDeviceMenu";
import { SpotifyVolume } from "@/widgets/spotify/components/SpotifyVolume";
import type {
  SpotifyPendingAction,
  SpotifyPlaybackDevice,
  SpotifyPlaybackState,
} from "@/widgets/spotify/types";
import { Button } from "@/components/ui/button";

const ACTIVE_TOGGLE = "text-primary hover:text-primary";

const CONTROL_BUTTON = "text-ink-3 hover:text-ink relative rounded-full";

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
  const size = compact ? "icon-xs" : "icon";
  const play = compact ? "size-8" : "size-10";
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
        <Button
          variant="ghost"
          size={size}
          aria-label={playback.shuffle ? "Disable shuffle" : "Enable shuffle"}
          aria-pressed={playback.shuffle}
          disabled={pendingActions.has("shuffle")}
          onClick={onToggleShuffle}
          className={cn(CONTROL_BUTTON, playback.shuffle && ACTIVE_TOGGLE)}
        >
          <Shuffle aria-hidden />
          {playback.shuffle && <ActiveDot />}
        </Button>
        <Button
          variant="ghost"
          size={size}
          aria-label={canRestart ? "Restart track" : "Previous track"}
          disabled={pendingActions.has("previous")}
          onClick={onPrevious}
          className={CONTROL_BUTTON}
        >
          <SkipBack aria-hidden />
        </Button>
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
        <Button
          variant="ghost"
          size={size}
          aria-label="Next track"
          disabled={pendingActions.has("next")}
          onClick={onNext}
          className={CONTROL_BUTTON}
        >
          <SkipForward aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size={size}
          aria-label={`Repeat ${playback.repeatMode}`}
          aria-pressed={playback.repeatMode !== "off"}
          disabled={pendingActions.has("repeat")}
          onClick={onCycleRepeat}
          className={cn(CONTROL_BUTTON, playback.repeatMode !== "off" && ACTIVE_TOGGLE)}
        >
          {playback.repeatMode === "track" ? <Repeat1 aria-hidden /> : <Repeat aria-hidden />}
          {playback.repeatMode !== "off" && <ActiveDot />}
        </Button>
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
