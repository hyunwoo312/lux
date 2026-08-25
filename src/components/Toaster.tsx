import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_IN, SPRING_CRISP } from "@/lib/motion";
import { TOAST_DURATION_MS, useToastStore } from "@/stores/useToastStore";

function barVariants(reduced: boolean): Variants {
  return {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: reduced ? { duration: 0 } : SPRING_CRISP,
    },
    exit: {
      opacity: 0,
      ...(reduced ? {} : { y: 8, scale: 0.98 }),
      transition: { duration: reduced ? 0 : DURATION.fast, ease: EASE_IN },
    },
  };
}

function useExpiry(key: string | undefined, paused: boolean, expire: () => void) {
  const remaining = useRef(TOAST_DURATION_MS);

  useEffect(() => {
    remaining.current = TOAST_DURATION_MS;
  }, [key]);

  useEffect(() => {
    if (key === undefined || paused) return;
    const startedAt = performance.now();
    const timer = window.setTimeout(expire, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= performance.now() - startedAt;
    };
  }, [key, paused, expire]);
}

export function Toaster() {
  const toast = useToastStore((s) => s.toast);
  const expire = useToastStore((s) => s.expire);
  const runAction = useToastStore((s) => s.runAction);
  const reduced = useReducedMotion() ?? false;
  const [paused, setPaused] = useState(false);

  useExpiry(toast?.key, paused, expire);

  return (
    <AnimatePresence mode="wait">
      {toast && (
        <motion.div
          key={toast.key}
          variants={barVariants(reduced)}
          initial="hidden"
          animate="show"
          exit="exit"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          className="
            glass text-ink fixed bottom-4 left-1/2 z-toast flex max-w-[calc(100vw-2rem)]
            -translate-x-1/2 items-center gap-3 overflow-hidden rounded-2xl py-2 pr-1.5 pl-4
          "
        >
          <div role="status" className="flex min-w-0 flex-col">
            <span className="text-body">{toast.message}</span>
            {toast.note && <span className="text-ink-3 text-caption">{toast.note}</span>}
          </div>
          {toast.action && (
            <Button variant="ghost" className="rounded-lg" onClick={runAction}>
              {toast.action.kind === "undo" ? "Undo" : toast.action.label}
            </Button>
          )}
          <Button
            size="icon-xs"
            variant="ghost"
            className="rounded-lg"
            onClick={expire}
            aria-label="Dismiss"
          >
            <X />
          </Button>
          {!reduced && (
            <span
              aria-hidden
              className="bg-primary toast-countdown absolute inset-x-0 bottom-0 h-0.5 origin-left"
              style={{
                animationDuration: `${TOAST_DURATION_MS}ms`,
                animationPlayState: paused ? "paused" : "running",
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
