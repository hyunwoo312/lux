import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSpotifyStore } from "@/widgets/spotify/useSpotifyStore";

export function SpotifyBackdrop() {
  const reduced = useReducedMotion();
  const ambient = useSpotifyStore((s) => s.ambient);
  const artworkUrl = useSpotifyStore((s) => s.nowPlayingArtworkUrl);

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
          className="absolute inset-0 size-full scale-110 object-cover blur-2xl"
        />
      </AnimatePresence>
      <div className="bg-background/68 absolute inset-0" aria-hidden />
    </>
  );
}
