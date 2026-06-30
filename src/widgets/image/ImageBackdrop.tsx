import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useActiveImage } from "@/widgets/image/hooks/useActiveImage";
import { type ImageBrightness, type ImageFit } from "@/widgets/image/types";
import { useImage } from "@/widgets/image/useImageStore";

const FIT_CLASS: Record<ImageFit, string> = {
  cover: "object-cover",
  contain: "object-contain",
  fill: "object-fill",
  "scale-down": "object-scale-down",
};

const BRIGHTNESS_OVERLAY: Record<ImageBrightness, string | null> = {
  normal: null,
  dim: "bg-black/25",
  dark: "bg-black/50",
};

export function ImageBackdrop() {
  const fit = useImage((c) => c.fit);
  const brightness = useImage((c) => c.brightness);
  const { activeItem, imageUrl, loadError } = useActiveImage();
  const reduced = useReducedMotion();

  if (loadError) {
    return (
      <div className="
        text-muted-foreground flex h-full w-full items-center justify-center p-4 text-center text-xs
      ">
        {loadError}
      </div>
    );
  }

  if (!imageUrl) return null;

  return (
    <>
      <AnimatePresence>
        <motion.img
          key={imageUrl}
          src={imageUrl}
          alt={activeItem?.fileName ?? "Image"}
          initial={{ opacity: reduced ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.4, ease: "easeInOut" }}
          className={cn("absolute inset-0 h-full w-full", FIT_CLASS[fit])}
        />
      </AnimatePresence>
      {BRIGHTNESS_OVERLAY[brightness] && (
        <div className={cn("absolute inset-0 z-10", BRIGHTNESS_OVERLAY[brightness])} aria-hidden />
      )}
    </>
  );
}
