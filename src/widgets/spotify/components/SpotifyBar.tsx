import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";
import { SpotifyArtwork } from "@/widgets/spotify/components/SpotifyArtwork";
import { SpotifyControls } from "@/widgets/spotify/components/SpotifyControls";
import { SpotifyTrackTitle } from "@/widgets/spotify/components/SpotifyTrackTitle";
import { SpotifyProgress } from "@/widgets/spotify/components/SpotifyProgress";
import type { SpotifyPlaybackController } from "@/widgets/spotify/hooks/useSpotifyPlayback";
import type { SpotifyPlaybackState, SpotifyTimeDisplayMode } from "@/widgets/spotify/types";
import { progressLabels } from "@/widgets/spotify/lib/duration";

const ART_MAX_WIDTH_SHARE = 0.34;
const ART_MIN_EDGE = 64;

export function SpotifyBar({
  controller,
  playback,
  timeDisplayMode,
  roomy,
  size,
}: {
  controller: SpotifyPlaybackController;
  playback: SpotifyPlaybackState;
  timeDisplayMode: SpotifyTimeDisplayMode;
  roomy: boolean;
  size: { width: number; height: number };
}) {
  const { displayedProgressMs } = controller;
  const { durationMs } = playback.track;
  const { leftLabel, rightLabel } = progressLabels(
    displayedProgressMs,
    durationMs,
    timeDisplayMode,
  );
  const artEdge = Math.max(
    ART_MIN_EDGE,
    Math.min(size.height, Math.round(size.width * ART_MAX_WIDTH_SHARE)),
  );

  return (
    <div className="flex h-full min-h-0 items-center gap-3">
      <SpotifyArtwork
        url={playback.track.artworkUrl}
        album={playback.track.album}
        className="shrink-0"
        style={{ width: artEdge, height: artEdge }}
        iconClassName="size-7"
      />

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <SpotifyTrackTitle title={playback.track.title} liked={controller.isTrackLiked} />

        <p className={cn(TYPE.rowMeta, "truncate")}>
          {roomy && controller.contextName
            ? `${playback.track.artist} · ${controller.contextName}`
            : playback.track.artist}
        </p>

        <SpotifyControls
          playback={playback}
          pendingActions={controller.pendingActions}
          canRestart={displayedProgressMs > controller.restartThresholdMs}
          showSideControls={roomy}
          compact
          deviceOptions={controller.deviceOptions}
          devicesLoading={controller.devicesLoading}
          devicesError={controller.devicesError}
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

        <SpotifyProgress
          durationMs={durationMs}
          displayedProgressMs={displayedProgressMs}
          leftLabel={leftLabel}
          rightLabel={rightLabel}
          showLabels={roomy}
          onChange={controller.changeProgress}
          onCommit={controller.commitProgress}
        />
      </div>
    </div>
  );
}
