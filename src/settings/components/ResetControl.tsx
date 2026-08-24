import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_OUT_STRONG, SPRING_POP } from "@/lib/motion";

type Phase = "idle" | "confirm" | "done";

type Props = {
  onReset: () => void;
  label?: string;
  confirmMessage?: string;
  doneMessage?: string;
};

const DONE_MS = 1500;
export function ResetControl({
  onReset,
  label = "Reset to defaults",
  confirmMessage = "Reset to defaults?",
  doneMessage = "Settings reset",
}: Props) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function confirm() {
    onReset();
    setPhase("done");
    timer.current = window.setTimeout(() => setPhase("idle"), DONE_MS);
  }

  const motionProps = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: DURATION.fast, ease: EASE_OUT_STRONG },
      };

  return (
    <div className="flex min-h-8 items-center justify-end">
      <AnimatePresence mode="wait" initial={false}>
        {phase === "idle" && (
          <motion.div key="idle" {...motionProps}>
            <Button variant="ghost-destructive" onClick={() => setPhase("confirm")}>
              {label}
            </Button>
          </motion.div>
        )}

        {phase === "confirm" && (
          <motion.div
            key="confirm"
            className="flex flex-wrap items-center justify-end gap-2"
            {...motionProps}
          >
            <span className="text-ink-3 text-caption">{confirmMessage}</span>
            <Button variant="ghost-destructive" onClick={confirm}>
              Reset
            </Button>
            <Button variant="ghost" onClick={() => setPhase("idle")}>
              Cancel
            </Button>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div
            key="done"
            className="text-primary flex items-center gap-1.5 px-3 text-caption font-medium"
            {...motionProps}
          >
            <motion.span
              initial={reduced ? false : { scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={SPRING_POP}
            >
              <Check className="size-4" />
            </motion.span>
            {doneMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
