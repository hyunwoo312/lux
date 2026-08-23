import { EASE_OUT } from "@/lib/motion";
import { useEffect, useMemo, useState } from "react";
import { RemoteImage } from "@/components/media/RemoteImage";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ListMusic, Music, Play } from "lucide-react";
import { StateMessage } from "@/components/StateMessage";
import { Button } from "@/components/ui/button";
import { useShallow } from "zustand/react/shallow";
import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";
import {
  loadSpotifyQueue,
  requestSpotifyPlaybackRefresh,
  useSpotifyPlaybackStore,
} from "@/widgets/spotify/hooks/useSpotifyPlayback";
import { dedupeUpNext } from "@/widgets/spotify/lib/queue";
import { skipSpotifyNext } from "@/widgets/spotify/lib/spotify-api";
import { RateLimitError } from "@/lib/net";
import type { SpotifyQueueItem } from "@/widgets/spotify/types";

const EQ_BARS = [
  { x: 0, duration: 0.7 },
  { x: 6, duration: 1.05 },
  { x: 12, duration: 0.85 },
];

const MAX_SKIP_STEPS = 5;

function PlayingBars({ animate }: { animate: boolean }) {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" className="text-primary shrink-0" aria-hidden>
      {EQ_BARS.map((bar, index) => (
        <rect
          key={bar.x}
          x={bar.x}
          y="0"
          width="4"
          height="14"
          rx="1"
          fill="currentColor"
          style={{
            transformBox: "fill-box",
            transformOrigin: "center bottom",
            ...(animate
              ? { animation: `lux-equalize ${bar.duration}s ease-in-out -${index * 0.3}s infinite` }
              : { transform: "scaleY(0.45)" }),
          }}
        />
      ))}
    </svg>
  );
}

function QueueArtwork({ url }: { url?: string }) {
  return url ? (
    <RemoteImage src={url} alt="" className="size-9 shrink-0 rounded-md object-cover" />
  ) : (
    <span className="bg-foreground/5 grid size-9 shrink-0 place-items-center rounded-md">
      <Music className="text-ink-3 size-4" aria-hidden />
    </span>
  );
}

export function SpotifyQueuePanel() {
  const reduced = useReducedMotion();
  const [playError, setPlayError] = useState<string | null>(null);
  const [skippingUri, setSkippingUri] = useState<string | null>(null);
  const now = useSpotifyPlaybackStore(
    useShallow((s) => ({
      trackId: s.playback?.track.id ?? null,
      title: s.playback?.track.title ?? null,
      artist: s.playback?.track.artist ?? null,
      artworkUrl: s.playback?.track.artworkUrl,
      isPlaying: s.playback?.isPlaying ?? false,
    })),
  );
  const { queue, queueLoading, queueError } = useSpotifyPlaybackStore(
    useShallow((s) => ({
      queue: s.queue,
      queueLoading: s.queueLoading,
      queueError: s.queueError,
    })),
  );

  useEffect(() => {
    setPlayError(null);
    void loadSpotifyQueue();
  }, [now.trackId]);

  const upNext = useMemo(() => dedupeUpNext(queue, now.trackId), [queue, now.trackId]);

  const skipToItem = (item: SpotifyQueueItem) => {
    if (skippingUri) return;
    const steps = queue.findIndex((entry) => entry.uri === item.uri) + 1;
    if (steps <= 0) return;
    setPlayError(null);
    if (steps > MAX_SKIP_STEPS) {
      setPlayError("That track is too far down the queue to skip to.");
      return;
    }
    setSkippingUri(item.uri);
    void (async () => {
      try {
        for (let step = 0; step < steps; step += 1) await skipSpotifyNext();
        requestSpotifyPlaybackRefresh();
      } catch (caught) {
        setPlayError(
          caught instanceof RateLimitError
            ? "Spotify is busy — try again in a moment."
            : caught instanceof Error
              ? caught.message
              : "Couldn't play that track.",
        );
      } finally {
        setSkippingUri(null);
      }
    })();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {now.title && (
        <div className="bg-foreground/5 flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <span className="sr-only">Now playing</span>
          <QueueArtwork url={now.artworkUrl} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-ink truncate text-body leading-tight font-medium">
              {now.title}
            </span>
            <span className="text-ink-3 truncate text-caption leading-tight">{now.artist}</span>
          </span>
          <PlayingBars animate={now.isPlaying && !reduced} />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <p className={TYPE.eyebrow}>Up next</p>
        {playError && <p className="text-ink-3 text-micro">{playError}</p>}
        {queueError && upNext.length === 0 ? (
          <div className="flex min-h-0 flex-1">
            <StateMessage
              compact
              message={queueError}
              action={
                <Button size="xs" variant="outline" onClick={() => void loadSpotifyQueue()}>
                  Retry
                </Button>
              }
            />
          </div>
        ) : queueLoading && upNext.length === 0 ? (
          <div className="flex min-h-0 flex-1">
            <StateMessage compact message="Loading queue…" />
          </div>
        ) : upNext.length === 0 ? (
          <div className="flex min-h-0 flex-1">
            <StateMessage compact icon={ListMusic} message="Nothing queued." />
          </div>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-0.5 scroll-fade overflow-y-auto">
            <AnimatePresence initial={false}>
              {upNext.map((item) => (
                <motion.li
                  key={item.id}
                  layout={!reduced}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
                  transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
                >
                  <button
                    type="button"
                    onClick={() => skipToItem(item)}
                    disabled={skippingUri !== null}
                    aria-label={`Play ${item.title}`}
                    className={cn(
                      "press-row transition-colors cursor-pointer",
                      `
                        focus-ring group flex w-full items-center gap-2.5 rounded-sm px-1 py-1
                        text-left transition-colors
                        hover:bg-accent/60
                        disabled:pointer-events-none
                      `,
                      skippingUri === item.uri && "opacity-60",
                    )}
                  >
                    <QueueArtwork url={item.artworkUrl} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-ink truncate text-body leading-tight">
                        {item.title}
                      </span>
                      <span className="text-ink-3 truncate text-caption leading-tight">
                        {item.subtitle}
                      </span>
                    </span>
                    <Play
                      className="
                        text-ink-3 size-3.5 shrink-0 opacity-0 transition-opacity
                        group-hover:opacity-100
                      "
                      aria-hidden
                    />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
