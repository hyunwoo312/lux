import type { CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_STANDARD, enterTween } from "@/lib/motion";
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
  const artCrossfade = enterTween(reduced, "slower", EASE_STANDARD);

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {url ? (
        <motion.img
          key={url}
          src={url}
          alt={`${album} cover`}
          draggable={false}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={artCrossfade}
          style={style}
          className={cn("rounded-lg object-cover shadow-md", className)}
        />
      ) : (
        <motion.span
          key="placeholder"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={artCrossfade}
          className={cn("bg-foreground/5 flex items-center justify-center rounded-lg", className)}
        >
          <SpotifyServiceIcon className={cn("size-9", iconClassName)} />
        </motion.span>
      )}
    </AnimatePresence>
  );
}
