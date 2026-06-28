import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { EASE_IN_OUT } from "@/lib/motion";
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
      transition={{ duration: reduced ? 0 : 0.3, ease: EASE_IN_OUT }}
      onAnimationComplete={onDone}
      style={{ position: "fixed", zIndex: 60 }}
      className="
        glass text-muted-foreground pointer-events-none flex items-center justify-center rounded-xl
        shadow-lg
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
  const savedLayouts = useDashboardStore((s) => s.savedLayouts);

  if (dropMorph) {
    return createPortal(<DropMorphGhost morph={dropMorph} onDone={endMorph} />, document.body);
  }

  if (!type) return null;
  const plugin = getWidgetPlugin(type);
  if (!plugin) return null;
  const Icon = plugin.icon;

  let placeholder: ReactNode = null;
  if (geometry && isOverGrid(pointerX, pointerY, geometry)) {
    const { rect } = resolveDrop(plugin, savedLayouts[type], layout, pointerX, pointerY, geometry);
    placeholder = (
      <div
        style={{ position: "fixed", left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: 50 }}
        className="
          border-foreground/40 bg-foreground/5 pointer-events-none rounded-xl border-2 border-dashed
        "
      />
    );
  }

  return createPortal(
    <>
      {placeholder}
      <div
        style={{
          position: "fixed",
          left: pointerX - ghostW / 2,
          top: pointerY - ghostH / 2,
          width: ghostW,
          height: ghostH,
          zIndex: 60,
        }}
        className="
          glass pointer-events-none flex items-center gap-3 rounded-xl px-3 text-sm shadow-lg
        "
      >
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-md",
            plugin.brandIcon
              ? "[&_img]:size-7 [&_svg]:size-7"
              : "bg-foreground/5 text-foreground/80 [&_img]:size-4 [&_svg]:size-4",
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
