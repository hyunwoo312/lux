import type { CSSProperties } from "react";
import { useEffect } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type BorderTrailProps = {
  active: boolean;
};

const TRAIL_SIZE = 52;
const TRAIL_DURATION_S = 7;

export function BorderTrail({ active }: BorderTrailProps) {
  const controls = useAnimationControls();
  const reduced = useReducedMotion() ?? false;
  const running = active && !reduced;

  useEffect(() => {
    if (!running) {
      controls.stop();
      return;
    }
    controls.start({
      offsetDistance: ["0%", "100%"],
      transition: { repeat: Infinity, duration: TRAIL_DURATION_S, ease: "linear" },
    });
  }, [running, controls]);

  return (
    <div
      className={cn(
        `
          pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent opacity-0
          transition-opacity duration-300 [mask-clip:padding-box,border-box]
          [mask-composite:intersect]
          [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]
        `,
        running && "opacity-100",
      )}
    >
      <motion.div
        className="bg-primary absolute aspect-square rounded-full blur-[1px]"
        style={
          {
            width: TRAIL_SIZE,
            offsetPath: `rect(0 auto auto 0 round ${TRAIL_SIZE}px)`,
          } as CSSProperties
        }
        animate={controls}
      />
    </div>
  );
}
