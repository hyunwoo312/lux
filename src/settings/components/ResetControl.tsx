import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";

type Phase = "idle" | "confirm" | "done";

type Props = {
  onReset: () => void;
  label?: string;
  confirmMessage?: string;
  doneMessage?: string;
};

const DONE_MS = 1500;
const PRESS = "transition-transform motion-safe:active:scale-95";

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
        transition: { duration: 0.18, ease: EASE_OUT_EXPO },
      };

  return (
    <div className="flex min-h-8 items-center justify-end">
      <AnimatePresence mode="wait" initial={false}>
        {phase === "idle" && (
          <motion.div key="idle" {...motionProps}>
            <Button
              size="sm"
              variant="ghost"
              className={cn("text-muted-foreground", PRESS)}
              onClick={() => setPhase("confirm")}
            >
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
            <span className="text-muted-foreground text-xs">{confirmMessage}</span>
            <Button
              size="sm"
              variant="ghost"
              className={cn("text-destructive hover:text-destructive", PRESS)}
              onClick={confirm}
            >
              Reset
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={PRESS}
              onClick={() => setPhase("idle")}
            >
              Cancel
            </Button>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div
            key="done"
            className="text-primary flex items-center gap-1.5 px-3 text-xs font-medium"
            {...motionProps}
          >
            <motion.span
              initial={reduced ? false : { scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 16 }}
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
