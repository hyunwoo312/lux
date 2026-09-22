import type { CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { fade } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { SpotifyServiceIcon } from "@/components/icons/service-icons";

export function SpotifyArtwork({
  url,
  album,
  className,
  iconClassName,
  style,
}: {
  url: string | undefined;
  album: string;
  className?: string;
  iconClassName?: string;
  style?: CSSProperties;
}) {
  const reduced = useReducedMotion();
  const crossfade = fade(reduced, "slower");

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {url ? (
        <motion.img
          key={url}
          src={url}
          alt={`${album} cover`}
          draggable={false}
          {...crossfade}
          style={style}
          className={cn("rounded-lg object-cover shadow-elev-2", className)}
        />
      ) : (
        <motion.span
          key="placeholder"
          {...crossfade}
          className={cn("bg-foreground/5 flex items-center justify-center rounded-lg", className)}
        >
          <SpotifyServiceIcon className={cn("size-9", iconClassName)} />
        </motion.span>
      )}
    </AnimatePresence>
  );
}
