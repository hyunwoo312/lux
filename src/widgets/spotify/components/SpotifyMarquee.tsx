import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type SpotifyMarqueeProps = {
  label: string;
  className?: string;
  children?: ReactNode;
};

export function SpotifyMarquee({ label, className, children }: SpotifyMarqueeProps) {
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
    <span ref={containerRef} className={cn("block overflow-hidden whitespace-nowrap", className)} aria-label={label}>
      <motion.span
        ref={textRef}
        className="inline-block"
        aria-hidden
        animate={shouldAnimate ? { x: [0, 0, -overflowDistance, -overflowDistance, 0] } : { x: 0 }}
        transition={
          shouldAnimate
            ? {
                duration: durationSeconds,
                ease: "linear",
                repeat: Infinity,
                times: [0, 0.16, 0.72, 0.88, 1],
              }
            : { duration: 0 }
        }
      >
        {children ?? label}
      </motion.span>
    </span>
  );
}
