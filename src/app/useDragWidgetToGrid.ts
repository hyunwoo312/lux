import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef } from "react";
import { isOverGrid, resolveDrop } from "@/widgets/core/drag";
import type { WidgetPlugin } from "@/widgets/core/types";
import { useWidgetDragStore } from "@/widgets/core/useWidgetDragStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useWidgetPaletteStore } from "@/stores/useWidgetPaletteStore";

const DRAG_THRESHOLD = 6;
const CLICK_SUPPRESS_MS = 300;

function commitDrop(plugin: WidgetPlugin, px: number, py: number, ghostW: number, ghostH: number) {
  const drag = useWidgetDragStore.getState();
  const { geometry } = drag;
  if (!geometry || !isOverGrid(px, py, geometry)) {
    drag.cancel();
    return;
  }
  const { layout, addWidget } = useDashboardStore.getState();
  const { spot, rect } = resolveDrop(plugin, layout, px, py, geometry);
  addWidget(plugin.type, spot);
  drag.drop({
    type: plugin.type,
    from: { x: px - ghostW / 2, y: py - ghostH / 2, w: ghostW, h: ghostH },
    to: rect,
  });
}

export function useDragWidgetToGrid() {
  const setOpen = useWidgetPaletteStore((s) => s.setOpen);
  const lastDragEnd = useRef(0);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, plugin: WidgetPlugin) => {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const rect = event.currentTarget.getBoundingClientRect();
    const ghostW = rect.width;
    const ghostH = rect.height;
    let started = false;

    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", onCancel);
    };
    const move = (e: PointerEvent) => {
      if (!started) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD) return;
        started = true;
        setOpen(false);
        useWidgetDragStore.getState().start(plugin.type, e.clientX, e.clientY, ghostW, ghostH);
      }
      useWidgetDragStore.getState().move(e.clientX, e.clientY);
    };
    const up = (e: PointerEvent) => {
      cleanup();
      if (!started) return;
      commitDrop(plugin, e.clientX, e.clientY, ghostW, ghostH);
      lastDragEnd.current = performance.now();
    };
    const onCancel = () => {
      cleanup();
      if (!started) return;
      useWidgetDragStore.getState().cancel();
      lastDragEnd.current = performance.now();
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", onCancel);
  };

  const suppressClick = () => performance.now() - lastDragEnd.current < CLICK_SUPPRESS_MS;

  return { onPointerDown, suppressClick };
}
