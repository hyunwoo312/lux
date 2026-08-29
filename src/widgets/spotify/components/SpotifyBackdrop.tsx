import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_STANDARD, enterTween } from "@/lib/motion";
import { useSpotifyPlaybackStore } from "@/widgets/spotify/hooks/useSpotifyPlayback";

export function SpotifyBackdrop() {
  const reduced = useReducedMotion();
  const artworkUrl = useSpotifyPlaybackStore((s) => s.playback?.track.artworkUrl ?? null);

  if (!artworkUrl) return null;

  return (
    <>
      <AnimatePresence>
        <motion.img
          key={artworkUrl}
          src={artworkUrl}
          alt=""
          aria-hidden
          initial={{ opacity: reduced ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={enterTween(reduced, "slower", EASE_STANDARD)}
          className="absolute inset-0 size-full scale-105 object-cover blur-lg saturate-[1.4]"
        />
      </AnimatePresence>
      <div
        aria-hidden
        className="
          absolute inset-0
          bg-[linear-gradient(to_top,color-mix(in_oklab,var(--background)_72%,transparent)_0%,color-mix(in_oklab,var(--background)_40%,transparent)_55%,color-mix(in_oklab,var(--background)_24%,transparent)_100%)]
        "
      />
    </>
  );
}
