import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DURATION, EASE_STANDARD } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { GeneratedWallpaper } from "@/app/wallpaper/GeneratedWallpaper";
import { useWallpaperStore, type WallpaperFit } from "@/stores/useWallpaperStore";

const FIT_CLASS: Record<WallpaperFit, string> = {
  cover: "object-cover",
  contain: "object-contain",
  fill: "object-fill",
  "scale-down": "object-scale-down",
};

const BLEED_PER_BLUR_PX = 2;

export function Wallpaper({ imageUrl }: { imageUrl: string | null }) {
  const source = useWallpaperStore((s) => s.source);
  const fit = useWallpaperStore((s) => s.fit);
  const dim = useWallpaperStore((s) => s.dim);
  const blur = useWallpaperStore((s) => s.blur);
  const reduced = useReducedMotion();
  const isGenerated = source === "generated";
  const showImage = imageUrl !== null && !isGenerated;

  const hasShownImage = useRef(false);
  const crossfade = hasShownImage.current && !reduced;

  useEffect(() => {
    if (showImage) hasShownImage.current = true;
  }, [showImage]);

  const bleed = blur * BLEED_PER_BLUR_PX;

  return (
    <div aria-hidden className="fixed inset-0 z-wallpaper">
      <div className="wallpaper absolute inset-0" />
      {isGenerated && <GeneratedWallpaper />}
      <AnimatePresence>
        {showImage && (
          <motion.img
            key={imageUrl}
            src={imageUrl}
            alt=""
            initial={crossfade ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.slow, ease: EASE_STANDARD }}
            className={cn("absolute", FIT_CLASS[fit])}
            style={{
              top: -bleed,
              left: -bleed,
              width: `calc(100% + ${bleed * 2}px)`,
              height: `calc(100% + ${bleed * 2}px)`,
              ...(blur > 0 ? { filter: `blur(${blur}px)` } : {}),
            }}
          />
        )}
        {showImage && dim > 0 && (
          <motion.div
            key="dim"
            initial={false}
            animate={{ opacity: dim, transition: { duration: 0 } }}
            exit={{ opacity: 0, transition: { duration: DURATION.slow, ease: EASE_STANDARD } }}
            className="absolute inset-0 bg-black"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
