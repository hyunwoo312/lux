import { EASE_OUT } from "@/lib/motion";
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
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: reduced ? 0 : 0.18, ease: EASE_OUT }}
          className="
            bg-popover border-border/60 absolute inset-x-2 bottom-2 z-10 flex items-center gap-2
            rounded-lg border px-2.5 py-1.5 shadow-lg
          "
        >
          <span className="text-ink-3 min-w-0 flex-1 truncate text-caption">
            Removed {removed.link.title}
          </span>
          <button
            type="button"
            onClick={() => undoRemove(instanceId)}
            className="text-primary shrink-0 cursor-pointer text-caption font-semibold"
          >
            Undo
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
