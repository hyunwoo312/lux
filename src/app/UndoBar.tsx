import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_IN, SPRING_CRISP } from "@/lib/motion";
import { UNDO_WINDOW_MS, useDashboardStore } from "@/stores/useDashboardStore";
import { getWidgetPlugin } from "@/widgets/registry";

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

export function UndoBar() {
  const reduced = useReducedMotion() ?? false;
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
          variants={barVariants(reduced)}
          initial="hidden"
          animate="show"
          exit="exit"
          className="
            glass text-ink fixed bottom-4 left-1/2 z-overlay flex max-w-[calc(100vw-2rem)]
            -translate-x-1/2 items-center gap-3 overflow-hidden rounded-2xl py-2 pr-1.5 pl-4
          "
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-body">{name} removed</span>
            {note && <span className="text-ink-3 text-caption">{note}</span>}
          </span>
          <Button variant="ghost" className="rounded-lg" onClick={undoRemove}>
            Undo
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className="rounded-lg"
            onClick={settle}
            aria-label="Dismiss"
          >
            <X />
          </Button>
          {!reduced && (
            <motion.span
              key={pending.instance.id}
              aria-hidden
              className="bg-primary absolute inset-x-0 bottom-0 h-0.5 origin-left"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: UNDO_WINDOW_MS / 1000, ease: "linear" }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
