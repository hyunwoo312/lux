import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from "motion/react";
import { cn } from "@/lib/utils";
import { useActiveImage } from "@/widgets/image/hooks/useActiveImage";
import { type ImageBrightness, type ImageFit, type ImageTransition } from "@/widgets/image/types";
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

type EnterVariant = {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
};

const ENTER_VARIANTS: Record<ImageTransition, EnterVariant> = {
  crossfade: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  slide: {
    initial: { opacity: 0, x: "4%" },
    animate: { opacity: 1, x: "0%" },
    exit: { opacity: 0, x: "-4%" },
  },
  none: { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
};

type KenBurnsFrame = { scale: [number, number]; x: [string, string]; y: [string, string] };

const KEN_BURNS: KenBurnsFrame[] = [
  { scale: [1.02, 1.12], x: ["0%", "-2.5%"], y: ["0%", "-2%"] },
  { scale: [1.12, 1.02], x: ["-2.5%", "0%"], y: ["-2%", "0%"] },
  { scale: [1.02, 1.12], x: ["0%", "2.5%"], y: ["0%", "2%"] },
  { scale: [1.12, 1.02], x: ["2.5%", "0%"], y: ["2%", "0%"] },
];
const KEN_BURNS_FALLBACK: KenBurnsFrame = { scale: [1.02, 1.12], x: ["0%", "0%"], y: ["0%", "0%"] };
const KEN_BURNS_DURATION = 20;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function ImageBackdrop() {
  const fit = useImage((c) => c.fit);
  const brightness = useImage((c) => c.brightness);
  const transition = useImage((c) => c.transition);
  const kenBurns = useImage((c) => c.kenBurns);
  const { activeItem, activeIndex, imageUrl, loadError } = useActiveImage();
  const reduced = useReducedMotion();

  if (loadError) {
    return (
      <div
        className={cn(`
          text-muted-foreground flex h-full w-full items-center justify-center p-4 text-center
          text-xs
        `)}
      >
        {loadError}
      </div>
    );
  }

  if (!imageUrl) return null;

  const effectiveTransition: ImageTransition = reduced ? "none" : transition;
  const variant = ENTER_VARIANTS[effectiveTransition];
  const enterTransition =
    effectiveTransition === "none"
      ? { duration: 0 }
      : { duration: 0.4, ease: "easeInOut" as const };

  const panning = kenBurns && !reduced;
  const frame = KEN_BURNS[activeIndex % KEN_BURNS.length] ?? KEN_BURNS_FALLBACK;

  const objectPosition =
    fit === "cover" && activeItem?.focal
      ? `${clamp01(activeItem.focal.x) * 100}% ${clamp01(activeItem.focal.y) * 100}%`
      : undefined;
  const caption = activeItem?.caption?.trim();

  return (
    <>
      <AnimatePresence>
        <motion.div
          key={imageUrl}
          initial={variant.initial}
          animate={variant.animate}
          exit={variant.exit}
          transition={enterTransition}
          className="absolute inset-0"
        >
          <motion.img
            src={imageUrl}
            alt={activeItem?.fileName ?? "Image"}
            initial={panning ? { scale: frame.scale[0], x: frame.x[0], y: frame.y[0] } : false}
            animate={panning ? { scale: frame.scale, x: frame.x, y: frame.y } : undefined}
            transition={
              panning
                ? {
                    duration: KEN_BURNS_DURATION,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse",
                  }
                : undefined
            }
            style={objectPosition ? { objectPosition } : undefined}
            className={cn("h-full w-full", FIT_CLASS[fit])}
          />
        </motion.div>
      </AnimatePresence>
      {BRIGHTNESS_OVERLAY[brightness] && (
        <div className={cn("absolute inset-0 z-10", BRIGHTNESS_OVERLAY[brightness])} aria-hidden />
      )}
      {caption && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-2">
          <span
            className={cn(`
              bg-card text-card-foreground border-border/60 line-clamp-2 max-w-full rounded-md
              border px-2.5 py-1 text-center text-xs font-medium shadow-sm
            `)}
          >
            {caption}
          </span>
        </div>
      )}
    </>
  );
}
