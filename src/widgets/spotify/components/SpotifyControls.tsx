import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpotifyDeviceMenu } from "@/widgets/spotify/components/SpotifyDeviceMenu";
import { SpotifyVolume } from "@/widgets/spotify/components/SpotifyVolume";
import type {
  SpotifyPendingAction,
  SpotifyPlaybackDevice,
  SpotifyPlaybackState,
} from "@/widgets/spotify/types";

const CONTROL_BUTTON = `
  text-muted-foreground inline-flex size-8 items-center justify-center rounded-full
  transition-colors
  hover:text-foreground
  focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none
  disabled:pointer-events-none disabled:opacity-40
`;

type SpotifyControlsProps = {
  playback: SpotifyPlaybackState;
  pendingActions: Set<SpotifyPendingAction>;
  canRestart: boolean;
  showSideControls: boolean;
  deviceOptions: SpotifyPlaybackDevice[];
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
  deviceOptions,
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
  return (
    <div className="flex items-center justify-between gap-1">
      <div className="flex w-8 justify-start">
        {showSideControls && (
          <SpotifyDeviceMenu
            devices={deviceOptions}
            activeId={playback.device.id}
            disabled={pendingActions.has("device")}
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
          className={cn(CONTROL_BUTTON, playback.shuffle && "text-primary hover:text-primary")}
        >
          <Shuffle className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={canRestart ? "Restart track" : "Previous track"}
          disabled={pendingActions.has("previous")}
          onClick={onPrevious}
          className={CONTROL_BUTTON}
        >
          <SkipBack className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={playback.isPlaying ? "Pause" : "Play"}
          disabled={pendingActions.has("playback")}
          onClick={onTogglePlayback}
          className="
            bg-primary text-primary-foreground inline-flex size-10 items-center justify-center
            rounded-full transition-transform
            hover:scale-105
            focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none
            disabled:pointer-events-none disabled:opacity-50
          "
        >
          {playback.isPlaying ? (
            <Pause className="size-5 fill-current" aria-hidden />
          ) : (
            <Play className="size-5 translate-x-px fill-current" aria-hidden />
          )}
        </button>
        <button
          type="button"
          aria-label="Next track"
          disabled={pendingActions.has("next")}
          onClick={onNext}
          className={CONTROL_BUTTON}
        >
          <SkipForward className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={`Repeat ${playback.repeatMode}`}
          aria-pressed={playback.repeatMode !== "off"}
          disabled={pendingActions.has("repeat")}
          onClick={onCycleRepeat}
          className={cn(
            CONTROL_BUTTON,
            playback.repeatMode !== "off" && "text-primary hover:text-primary",
          )}
        >
          {playback.repeatMode === "track" ? (
            <Repeat1 className="size-4" aria-hidden />
          ) : (
            <Repeat className="size-4" aria-hidden />
          )}
        </button>
      </div>

      <div className="flex w-8 justify-end">
        {showSideControls && (
          <SpotifyVolume
            volumePercent={volumePercent}
            disabled={pendingActions.has("volume")}
            onChange={onChangeVolume}
            onCommit={onCommitVolume}
          />
        )}
      </div>
    </div>
  );
}
