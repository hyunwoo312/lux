import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { getWidgetPlugin } from "@/widgets/registry";

export function UndoBar() {
  const reduced = useReducedMotion();
  const pending = useDashboardStore((s) => s.pendingRemoval);
  const undoRemove = useDashboardStore((s) => s.undoRemove);
  const settle = useDashboardStore((s) => s.settlePendingRemoval);

  const plugin = pending ? getWidgetPlugin(pending.instance.type) : null;
  const name = pending ? (plugin?.name ?? "Widget") : null;
  const note = pending ? (plugin?.removalNote?.(pending.instance.id) ?? null) : null;

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: reduced ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : 12 }}
          transition={{ duration: reduced ? 0 : DURATION.base, ease: EASE_OUT }}
          className="
            bg-card text-card-foreground fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 elev-2
            items-center gap-3 rounded-2xl py-1.5 pr-1.5 pl-4
          "
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-body">{name} removed</span>
            {note && <span className="text-ink-3 text-caption">{note}</span>}
          </span>
          <Button variant="ghost" className="rounded-full" onClick={undoRemove}>
            Undo
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className="rounded-full"
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
