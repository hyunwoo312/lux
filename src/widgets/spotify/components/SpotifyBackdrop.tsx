import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSpotify } from "@/widgets/spotify/useSpotifyStore";
import { useSpotifyPlaybackStore } from "@/widgets/spotify/hooks/useSpotifyPlayback";

export function SpotifyBackdrop() {
  const reduced = useReducedMotion();
  const ambient = useSpotify((d) => d.ambient);
  const artworkUrl = useSpotifyPlaybackStore((s) => s.playback?.track.artworkUrl ?? null);

  if (!ambient || !artworkUrl) return null;

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
          transition={{ duration: reduced ? 0 : 0.6, ease: "easeInOut" }}
          className="
            absolute inset-0 size-full scale-110 object-cover blur-xl saturate-[1.75] brightness-110
          "
        />
      </AnimatePresence>
      <div className="bg-background/46 absolute inset-0" aria-hidden />
    </>
  );
}
