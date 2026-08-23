import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";
import { progressLabels } from "@/widgets/spotify/lib/duration";
import { SpotifyArtwork } from "@/widgets/spotify/components/SpotifyArtwork";
import { SpotifyControls } from "@/widgets/spotify/components/SpotifyControls";
import { SpotifyTrackTitle } from "@/widgets/spotify/components/SpotifyTrackTitle";
import { SpotifyProgress } from "@/widgets/spotify/components/SpotifyProgress";
import type { SpotifyPlaybackController } from "@/widgets/spotify/hooks/useSpotifyPlayback";
import type { SpotifyPlaybackState, SpotifyTimeDisplayMode } from "@/widgets/spotify/types";

type SpotifyPlayerProps = {
  controller: SpotifyPlaybackController;
  playback: SpotifyPlaybackState;
  timeDisplayMode: SpotifyTimeDisplayMode;
};

export function SpotifyPlayer({ controller, playback, timeDisplayMode }: SpotifyPlayerProps) {
  const { displayedProgressMs } = controller;
  const { durationMs } = playback.track;
  const { leftLabel, rightLabel } = progressLabels(
    displayedProgressMs,
    durationMs,
    timeDisplayMode,
  );

  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-3">
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <SpotifyArtwork
          url={playback.track.artworkUrl}
          album={playback.track.album}
          className="aspect-square max-h-full max-w-full"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-0.5">
        <SpotifyTrackTitle title={playback.track.title} liked={controller.isTrackLiked} />
        <p className={cn(TYPE.rowSubtitle, "truncate")}>{playback.track.artist}</p>
        <p className="text-ink-4 truncate text-micro">
          {controller.contextName
            ? `${playback.track.album} · from ${controller.contextName}`
            : playback.track.album}
        </p>
      </div>

      <SpotifyProgress
        durationMs={durationMs}
        displayedProgressMs={displayedProgressMs}
        leftLabel={leftLabel}
        rightLabel={rightLabel}
        disabled={controller.pendingActions.has("seek")}
        onChange={controller.changeProgress}
        onCommit={controller.commitProgress}
      />

      <SpotifyControls
        playback={playback}
        pendingActions={controller.pendingActions}
        canRestart={displayedProgressMs > controller.restartThresholdMs}
        showSideControls
        deviceOptions={controller.deviceOptions}
        volumePercent={controller.volumePercent}
        onTogglePlayback={controller.togglePlayback}
        onPrevious={controller.previousTrack}
        onNext={controller.nextTrack}
        onToggleShuffle={controller.toggleShuffle}
        onCycleRepeat={controller.cycleRepeat}
        onTransferDevice={controller.transferDevice}
        onOpenDeviceMenu={controller.loadDevices}
        onChangeVolume={controller.changeVolume}
        onCommitVolume={controller.commitVolume}
      />
    </div>
  );
}
