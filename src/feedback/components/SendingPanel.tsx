import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { EASE_OUT } from "@/lib/motion";

const SETTLE_MS = 280;
const SHIMMER_SECONDS = 1.6;

const PING = "bg-primary absolute inline-flex size-full animate-ping rounded-full opacity-75";

type Props = {
  settling: boolean;
  onSettled: () => void;
};

export function SendingPanel({ settling, onSettled }: Props) {
  const reduced = useReducedMotion() ?? false;
  const progress = useMotionValue(0);
  const fillX = useTransform(progress, (value) => `${value - 100}%`);
  useEffect(() => {
    if (!settling) return;
    const controls = animate(progress, 100, {
      duration: reduced ? 0 : SETTLE_MS / 1000,
      ease: EASE_OUT,
      onComplete: onSettled,
    });
    return () => controls.stop();
  }, [settling, progress, reduced, onSettled]);

  return (
    <div className="flex min-h-52 flex-col justify-center gap-6 p-8">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="relative flex size-2">
            {!reduced && !settling && <span className={PING} />}
            <span className="bg-primary relative inline-flex size-2 rounded-full" />
          </span>
          <h3 className="text-ink text-body font-semibold">
            {settling ? "Delivered" : "Sending feedback"}
          </h3>
        </div>
        <p role="status" className="text-ink-3 text-caption">
          {settling ? "Opening your confirmation." : "Handing it to the Lux relay."}
        </p>
      </div>

      <div
        role="progressbar"
        aria-label="Sending feedback"
        aria-valuetext={settling ? "Delivered" : "Sending"}
        className="bg-foreground/10 relative h-2.5 w-full overflow-hidden rounded-full"
      >
        {!reduced && !settling && (
          <motion.div
            aria-hidden
            className="from-primary/0 via-primary/60 to-primary/0 h-full w-1/2 bg-linear-to-r"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ repeat: Infinity, duration: SHIMMER_SECONDS, ease: "linear" }}
          />
        )}
        <motion.div style={{ x: fillX }} className="bg-primary absolute inset-0 rounded-full" />
      </div>
    </div>
  );
}
