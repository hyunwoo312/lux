import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { EASE_OUT, EASE_OUT_STRONG } from "@/lib/motion";
import { FEEDBACK_TIMEOUT_MS } from "@/lib/net";

const IN_FLIGHT_CEILING = 92;
const SETTLE_MS = 280;

const PING = "bg-primary absolute inline-flex size-full animate-ping rounded-full opacity-75";

type Props = {
  settling: boolean;
  onSettled: () => void;
};

export function SendingPanel({ settling, onSettled }: Props) {
  const reduced = useReducedMotion() ?? false;
  const progress = useMotionValue(0);
  const percent = useTransform(progress, (value) => Math.round(value));
  const fillX = useTransform(progress, (value) => `${value - 100}%`);
  useEffect(() => {
    const controls = settling
      ? animate(progress, 100, {
          duration: reduced ? 0 : SETTLE_MS / 1000,
          ease: EASE_OUT,
          onComplete: onSettled,
        })
      : animate(progress, IN_FLIGHT_CEILING, {
          duration: reduced ? 0 : FEEDBACK_TIMEOUT_MS / 1000,
          ease: EASE_OUT_STRONG,
        });
    return () => controls.stop();
  }, [settling, progress, reduced, onSettled]);

  return (
    <div className="flex min-h-52 flex-col justify-center gap-6 p-8">
      <div className="flex items-end justify-between gap-4">
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

        <div className="flex shrink-0 items-baseline gap-1">
          <motion.span className="text-ink text-display-sm font-light tabular-nums">
            {percent}
          </motion.span>
          <span className="text-ink-4 text-body font-medium">%</span>
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Sending feedback"
        aria-valuetext={settling ? "Delivered" : "Sending"}
        className="bg-foreground/10 relative h-2.5 w-full overflow-hidden rounded-full"
      >
        <motion.div
          style={{ x: fillX }}
          className="
            from-primary/50 via-bloom to-primary/50 size-full rounded-full bg-gradient-to-r
            shadow-[0_0_10px_var(--bloom)]
          "
        >
          {!reduced && (
            <motion.div
              aria-hidden
              className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent"
              animate={{ x: ["-150%", "400%"] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
