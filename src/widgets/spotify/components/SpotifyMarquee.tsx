import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { STILL } from "@/lib/motion";
import { cn } from "@/lib/utils";

type SpotifyMarqueeProps = {
  label: string;
  className?: string;
};

export function SpotifyMarquee({ label, className }: SpotifyMarqueeProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [overflowDistance, setOverflowDistance] = useState(0);

  const measureOverflow = useCallback(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;
    setOverflowDistance(Math.max(0, Math.ceil(text.scrollWidth - container.clientWidth)));
  }, []);

  useEffect(() => {
    measureOverflow();
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;
    const observer = new ResizeObserver(measureOverflow);
    observer.observe(container);
    observer.observe(text);
    return () => observer.disconnect();
  }, [label, measureOverflow]);

  const shouldAnimate = overflowDistance > 1 && !reduced;
  const durationSeconds = Math.min(18, Math.max(8, label.length * 0.28));

  return (
    <span ref={containerRef} className={cn("block overflow-hidden whitespace-nowrap", className)}>
      <motion.span
        ref={textRef}
        className="inline-block"
        animate={shouldAnimate ? { x: [0, 0, -overflowDistance, -overflowDistance, 0] } : { x: 0 }}
        transition={
          shouldAnimate
            ? {
                duration: durationSeconds,
                ease: "linear",
                repeat: Infinity,
                times: [0, 0.16, 0.72, 0.88, 1],
              }
            : STILL
        }
      >
        {label}
      </motion.span>
    </span>
  );
}
