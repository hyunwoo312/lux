import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { EASE_STANDARD } from "@/lib/motion";
import { isOverGrid, resolveDrop } from "@/widgets/core/drag";
import { useWidgetDragStore, type DropMorph } from "@/widgets/core/useWidgetDragStore";
import { getWidgetPlugin } from "@/widgets/registry";
import { useDashboardStore } from "@/stores/useDashboardStore";

function DropMorphGhost({ morph, onDone }: { morph: DropMorph; onDone: () => void }) {
  const reduced = useReducedMotion();
  const plugin = getWidgetPlugin(morph.type);
  const Icon = plugin?.icon;
  return (
    <motion.div
      initial={{
        left: morph.from.x,
        top: morph.from.y,
        width: morph.from.w,
        height: morph.from.h,
        opacity: 1,
      }}
      animate={{
        left: morph.to.x,
        top: morph.to.y,
        width: morph.to.w,
        height: morph.to.h,
        opacity: 0,
      }}
      transition={{ duration: reduced ? 0 : 0.3, ease: EASE_STANDARD }}
      onAnimationComplete={onDone}
      className="
        glass text-ink-3 fixed z-modal pointer-events-none flex items-center justify-center
        rounded-2xl shadow-lg
        [&_img]:size-7
        [&_svg]:size-7
      "
    >
      {Icon && <Icon />}
    </motion.div>
  );
}

export function WidgetDragOverlay() {
  const type = useWidgetDragStore((s) => s.type);
  const pointerX = useWidgetDragStore((s) => s.pointerX);
  const pointerY = useWidgetDragStore((s) => s.pointerY);
  const ghostW = useWidgetDragStore((s) => s.ghostW);
  const ghostH = useWidgetDragStore((s) => s.ghostH);
  const geometry = useWidgetDragStore((s) => s.geometry);
  const dropMorph = useWidgetDragStore((s) => s.dropMorph);
  const endMorph = useWidgetDragStore((s) => s.endMorph);
  const layout = useDashboardStore((s) => s.layout);

  if (dropMorph) {
    return createPortal(<DropMorphGhost morph={dropMorph} onDone={endMorph} />, document.body);
  }

  if (!type) return null;
  const plugin = getWidgetPlugin(type);
  if (!plugin) return null;
  const Icon = plugin.icon;

  let placeholder: ReactNode = null;
  if (geometry && isOverGrid(pointerX, pointerY, geometry)) {
    const { rect } = resolveDrop(plugin, layout, pointerX, pointerY, geometry);
    placeholder = (
      <div
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
        }}
        className="
          border-foreground/40 bg-foreground/5 fixed z-overlay pointer-events-none rounded-2xl
          border-2 border-dashed
        "
      />
    );
  }

  return createPortal(
    <>
      {placeholder}
      <div
        style={{
          left: pointerX - ghostW / 2,
          top: pointerY - ghostH / 2,
          width: ghostW,
          height: ghostH,
        }}
        className="
          glass fixed z-modal pointer-events-none flex items-center gap-3 rounded-2xl px-3 text-body
          shadow-lg
        "
      >
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-md",
            plugin.brandIcon
              ? "[&_img]:size-7 [&_svg]:size-7"
              : "bg-foreground/5 text-ink-2 [&_img]:size-4 [&_svg]:size-4",
          )}
        >
          <Icon />
        </span>
        <span className="font-medium">{plugin.name}</span>
      </div>
    </>,
    document.body,
  );
}
