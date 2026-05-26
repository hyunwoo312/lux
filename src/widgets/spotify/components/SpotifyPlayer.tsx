import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SpotifyServiceIcon } from "@/components/icons/service-icons";
import { SpotifyControls } from "@/widgets/spotify/components/SpotifyControls";
import { SpotifyMarquee } from "@/widgets/spotify/components/SpotifyMarquee";
import { SpotifyProgress } from "@/widgets/spotify/components/SpotifyProgress";
import type { SpotifyPlaybackController } from "@/widgets/spotify/hooks/useSpotifyPlayback";
import type {
  SpotifyPlaybackState,
  SpotifyResponsiveView,
  SpotifyTimeDisplayMode,
} from "@/widgets/spotify/types";

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

type SpotifyPlayerProps = {
  controller: SpotifyPlaybackController;
  playback: SpotifyPlaybackState;
  view: SpotifyResponsiveView;
  timeDisplayMode: SpotifyTimeDisplayMode;
};

export function SpotifyPlayer({ controller, playback, view, timeDisplayMode }: SpotifyPlayerProps) {
  const reduced = useReducedMotion();
  const { displayedProgressMs } = controller;
  const { durationMs } = playback.track;
  const leftLabel = formatDuration(displayedProgressMs);
  const rightLabel =
    timeDisplayMode === "remaining"
      ? `-${formatDuration(Math.max(0, durationMs - displayedProgressMs))}`
      : formatDuration(durationMs);
  const showSideControls = view !== "compact";

  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-3">
      {view === "expanded" && (
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <AnimatePresence initial={false} mode="popLayout">
            {playback.track.artworkUrl ? (
              <motion.img
                key={playback.track.artworkUrl}
                src={playback.track.artworkUrl}
                alt={`${playback.track.album} cover`}
                draggable={false}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.5, ease: "easeInOut" }}
                className="aspect-square max-h-full max-w-full rounded-lg object-cover shadow-md"
              />
            ) : (
              <motion.span
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.5, ease: "easeInOut" }}
                className="
                  bg-foreground/5 flex aspect-square h-full max-h-40 items-center justify-center
                  rounded-lg
                "
              >
                <SpotifyServiceIcon className="size-9" />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-0.5">
        <SpotifyMarquee label={playback.track.title} className="text-sm font-semibold" />
        <p className="text-muted-foreground truncate text-xs">{playback.track.artist}</p>
        {view !== "compact" && (
          <p className="text-muted-foreground/70 truncate text-2xs">{playback.track.album}</p>
        )}
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
        showSideControls={showSideControls}
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
