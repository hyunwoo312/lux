import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { GeneratedWallpaper } from "@/app/wallpaper/GeneratedWallpaper";
import { useWallpaperStore, type WallpaperFit } from "@/stores/useWallpaperStore";

const FIT_CLASS: Record<WallpaperFit, string> = {
  cover: "object-cover",
  contain: "object-contain",
  fill: "object-fill",
  "scale-down": "object-scale-down",
};

export function Wallpaper({ imageUrl }: { imageUrl: string | null }) {
  const source = useWallpaperStore((s) => s.source);
  const fit = useWallpaperStore((s) => s.fit);
  const dim = useWallpaperStore((s) => s.dim);
  const blur = useWallpaperStore((s) => s.blur);
  const reduced = useReducedMotion();
  const isGenerated = source === "generated";
  const showImage = imageUrl !== null && !isGenerated;

  return (
    <div aria-hidden className="fixed inset-0 -z-10">
      <div className="wallpaper absolute inset-0" />
      {isGenerated && <GeneratedWallpaper />}
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
      {(showImage || isGenerated) && dim > 0 && (
        <div className="absolute inset-0 bg-black" style={{ opacity: dim }} />
      )}
    </div>
  );
}
