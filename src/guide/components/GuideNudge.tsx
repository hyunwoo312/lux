import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_IN, SPRING_CRISP } from "@/lib/motion";
import { useGuideStore } from "@/guide/useGuideStore";

const VISIBLE_MS = 9000;

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

export function GuideNudge() {
  const reduced = useReducedMotion() ?? false;
  const nudgeOpen = useGuideStore((s) => s.nudgeOpen);
  const dismissNudge = useGuideStore((s) => s.dismissNudge);
  const openGuide = useGuideStore((s) => s.openGuide);

  useEffect(() => {
    if (!nudgeOpen) return;
    const timer = window.setTimeout(dismissNudge, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [nudgeOpen, dismissNudge]);

  return (
    <AnimatePresence>
      {nudgeOpen && (
        <motion.div
          role="status"
          variants={barVariants(reduced)}
          initial="hidden"
          animate="show"
          exit="exit"
          className="
            glass-panel z-overlay fixed inset-x-0 bottom-6 mx-auto flex w-fit
            max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full py-2 pr-2 pl-4
          "
        >
          <BookOpen className="text-ink-3 size-4 shrink-0" aria-hidden />
          <span className="text-ink text-body">
            The guide is in the toolbar whenever you need it.
          </span>
          <Button size="sm" variant="ghost" onClick={() => openGuide()}>
            Reopen
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Dismiss"
            className="rounded-full"
            onClick={dismissNudge}
          >
            <X />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
