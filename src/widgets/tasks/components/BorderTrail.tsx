import type { CSSProperties } from "react";
import { useEffect } from "react";
import { motion, useAnimationControls } from "motion/react";
import { cn } from "@/lib/utils";

type BorderTrailProps = {
  active?: boolean;
  size?: number;
  duration?: number;
};

export function BorderTrail({ active = true, size = 52, duration = 7 }: BorderTrailProps) {
  const controls = useAnimationControls();

  useEffect(() => {
    if (!active) {
      controls.stop();
      return;
    }
    controls.start({
      offsetDistance: ["0%", "100%"],
      transition: { repeat: Infinity, duration, ease: "linear" },
    });
  }, [active, controls, duration]);

  return (
    <div
      className={cn(
        `
          pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent opacity-0
          transition-opacity duration-300 [mask-clip:padding-box,border-box]
          [mask-composite:intersect]
          [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]
        `,
        active && "opacity-100",
      )}
    >
      <motion.div
        className="bg-primary absolute aspect-square rounded-full blur-[1px]"
        style={{ width: size, offsetPath: `rect(0 auto auto 0 round ${size}px)` } as CSSProperties}
        animate={controls}
      />
    </div>
  );
}
