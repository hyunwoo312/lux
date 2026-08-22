import { DURATION, EASE_OUT } from "@/lib/motion";
import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const UNDO_MS = 6000;

export function PinUndoBar() {
  const reduced = useReducedMotion();
  const instanceId = useWidgetInstanceId();
  const removed = useQuickAccessStore((s) => s.removed[instanceId]);
  const undoRemove = useQuickAccessStore((s) => s.undoRemove);
  const dismissRemoved = useQuickAccessStore((s) => s.dismissRemoved);

  useEffect(() => {
    if (!removed) return;
    const timer = window.setTimeout(() => dismissRemoved(instanceId), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [removed, instanceId, dismissRemoved]);

  return (
    <AnimatePresence>
      {removed && (
        <motion.div
          key="undo"
          role="status"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: reduced ? 0 : DURATION.fast, ease: EASE_OUT }}
          className="
            border-input bg-background/60 absolute inset-x-2 bottom-2 z-10 flex items-center gap-2
            rounded-lg border px-2.5 py-1.5 shadow-lg backdrop-blur-sm
          "
        >
          <span className="text-ink-3 min-w-0 flex-1 truncate text-caption">
            Removed {removed.link.title}
          </span>
          <button
            type="button"
            onClick={() => undoRemove(instanceId)}
            className="press text-primary shrink-0 cursor-pointer text-caption font-semibold"
          >
            Undo
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
