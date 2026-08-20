import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EASE_OUT_QUINT } from "@/lib/motion";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { getWidgetPlugin } from "@/widgets/registry";

export function UndoBar() {
  const reduced = useReducedMotion();
  const pending = useDashboardStore((s) => s.pendingRemoval);
  const undoRemove = useDashboardStore((s) => s.undoRemove);
  const settle = useDashboardStore((s) => s.settlePendingRemoval);

  const name = pending ? (getWidgetPlugin(pending.instance.type)?.name ?? "Widget") : null;

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: reduced ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : 12 }}
          transition={{ duration: reduced ? 0 : 0.22, ease: EASE_OUT_QUINT }}
          className="
            bg-card text-card-foreground fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2
            items-center gap-3 rounded-full border py-1.5 pr-1.5 pl-4 shadow-lg
          "
        >
          <span className="text-sm">{name} removed</span>
          <Button size="sm" variant="ghost" className="rounded-full" onClick={undoRemove}>
            Undo
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 rounded-full"
            onClick={settle}
            aria-label="Dismiss"
          >
            <X />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
