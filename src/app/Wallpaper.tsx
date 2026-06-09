import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useActiveWallpaper } from "@/app/useActiveWallpaper";
import { useWallpaperStore, type WallpaperFit } from "@/stores/useWallpaperStore";

const FIT_CLASS: Record<WallpaperFit, string> = {
  cover: "object-cover",
  contain: "object-contain",
  fill: "object-fill",
  "scale-down": "object-scale-down",
};

export function Wallpaper() {
  const enabled = useWallpaperStore((s) => s.enabled);
  const fit = useWallpaperStore((s) => s.fit);
  const dim = useWallpaperStore((s) => s.dim);
  const blur = useWallpaperStore((s) => s.blur);
  const { imageUrl } = useActiveWallpaper(enabled);
  const reduced = useReducedMotion();
  const showImage = imageUrl !== null;

  return (
    <div aria-hidden className="fixed inset-0 -z-10">
      <div className="wallpaper absolute inset-0" />
      <AnimatePresence>
        {showImage && (
          <motion.img
            key={imageUrl}
            src={imageUrl}
            alt=""
            initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.5, ease: "easeInOut" }}
            className={cn("absolute inset-0 h-full w-full", FIT_CLASS[fit])}
            style={blur > 0 ? { filter: `blur(${blur}px)`, transform: "scale(1.06)" } : undefined}
          />
        )}
      </AnimatePresence>
      {showImage && dim > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: dim }} />}
    </div>
  );
}
