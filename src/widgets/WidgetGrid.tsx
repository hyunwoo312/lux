import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GridLayout, useContainerWidth } from "react-grid-layout";
import type { Compactor, EventCallback, LayoutItem } from "react-grid-layout";
import { cn } from "@/lib/utils";
import { CELL, GAP, gridColumns, gridWidth, PAD, UNIT } from "@/widgets/core/grid";
import {
  getLayoutBottom,
  resolveLayoutCollisions,
  resolveLocalDisplacement,
  type DragVector,
} from "@/widgets/core/layout-engine";
import { useWidgetDragStore } from "@/widgets/core/useWidgetDragStore";
import { WidgetHost } from "@/widgets/core/WidgetHost";
import { getWidgetPlugin } from "@/widgets/registry";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useDashboardStore } from "@/stores/useDashboardStore";

const MIN_ROWS = 8;
const EDIT_ROW_BUFFER = 1;
const BOTTOM_GUTTER = 16;
const SCROLL_ZONE = 100;
const SCROLL_MAX_SPEED = 20;
const DEFAULT_VECTOR: DragVector = { dx: 1, dy: 0 };

export function WidgetGrid() {
  const widgets = useDashboardStore((s) => s.widgets);
  const layout = useDashboardStore((s) => s.layout);
  const editing = useDashboardStore((s) => s.editing);
  const showGridLines = useAppSettingsStore((s) => s.showGridLines);
  const setLayout = useDashboardStore((s) => s.setLayout);
  const setColumns = useDashboardStore((s) => s.setColumns);
  const setGeometry = useWidgetDragStore((s) => s.setGeometry);
  const dragging = useWidgetDragStore((s) => s.type !== null);
  const { width, mounted, containerRef } = useContainerWidth();

  const [previewRows, setPreviewRows] = useState<number | null>(null);
  const [liveSize, setLiveSize] = useState<{ id: string; w: number; h: number } | null>(null);
  const [availableRows, setAvailableRows] = useState(MIN_ROWS);
  const activeWidgetId = useRef<string | null>(null);
  const dragDirection = useRef<DragVector>({ dx: 1, dy: 0 });
  const draggingElement = useRef<HTMLElement | null>(null);
  const scrollFrame = useRef<number | null>(null);

  const autoScroll = useCallback(() => {
    if (!activeWidgetId.current) {
      scrollFrame.current = null;
      return;
    }
    const el = draggingElement.current;
    if (el) {
      const depth = el.getBoundingClientRect().bottom - (window.innerHeight - SCROLL_ZONE);
      if (depth > 0) {
        const intensity = Math.min(1, depth / SCROLL_ZONE);
        window.scrollBy({ top: SCROLL_MAX_SPEED * intensity * intensity });
      }
    }
    scrollFrame.current = requestAnimationFrame(autoScroll);
  }, []);

  useEffect(
    () => () => {
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    },
    [],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const available = window.innerHeight - el.getBoundingClientRect().top - BOTTOM_GUTTER;
      setAvailableRows(Math.max(MIN_ROWS, Math.floor(available / UNIT)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [containerRef, width]);

  const cols = gridColumns(width);
  const gw = gridWidth(cols);

  useEffect(() => {
    setColumns(cols);
  }, [cols, setColumns]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !mounted) return;
    const publish = () => {
      const rect = el.getBoundingClientRect();
      const centerOffset = Math.max(0, (rect.width - gw) / 2);
      setGeometry({ left: rect.left + centerOffset, top: rect.top, cols });
    };
    publish();
    window.addEventListener("resize", publish);
    if (dragging) window.addEventListener("scroll", publish, true);
    return () => {
      window.removeEventListener("resize", publish);
      window.removeEventListener("scroll", publish, true);
    };
  }, [containerRef, mounted, gw, cols, setGeometry, dragging]);

  const compactor = useMemo<Compactor>(
    () => ({
      type: null,
      allowOverlap: true,
      preventCollision: false,
      compact: (input, columns) =>
        resolveLocalDisplacement(input, columns, activeWidgetId.current, dragDirection.current),
    }),
    [],
  );

  const track = (oldItem: LayoutItem | null, newItem: LayoutItem | null) => {
    if (!newItem) return;
    activeWidgetId.current = newItem.i;
    if (oldItem) dragDirection.current = { dx: newItem.x - oldItem.x, dy: newItem.y - oldItem.y };
  };

  const handleStart: EventCallback = (
    _layout,
    _oldItem,
    newItem,
    _placeholder,
    _event,
    element,
  ) => {
    if (!newItem) return;
    activeWidgetId.current = newItem.i;
    dragDirection.current = { dx: 1, dy: 0 };
    draggingElement.current = element ?? null;
    if (scrollFrame.current === null) scrollFrame.current = requestAnimationFrame(autoScroll);
  };

  const handleMove: EventCallback = (next, oldItem, newItem, _placeholder, _event, element) => {
    track(oldItem, newItem);
    if (newItem) setLiveSize({ id: newItem.i, w: newItem.w, h: newItem.h });
    if (element) draggingElement.current = element;
    const resolved = resolveLocalDisplacement(
      next,
      cols,
      activeWidgetId.current,
      dragDirection.current,
    );
    setPreviewRows(getLayoutBottom(resolved) + EDIT_ROW_BUFFER);
  };

  const handleStop: EventCallback = (next, oldItem, newItem) => {
    track(oldItem, newItem);
    setPreviewRows(null);
    setLiveSize(null);
    draggingElement.current = null;
    if (scrollFrame.current !== null) {
      cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = null;
    }
    const draggedId = activeWidgetId.current;
    const vector = dragDirection.current;
    const displaced = resolveLocalDisplacement(next, cols, draggedId, vector);
    const cleaned = resolveLayoutCollisions(displaced, cols, draggedId, vector);
    activeWidgetId.current = null;
    setLayout(cleaned);
  };

  const constrainedLayout = useMemo(() => {
    const typeById = new Map(widgets.map((widget) => [widget.id, widget.type]));
    return layout.map((item) => {
      const type = typeById.get(item.i);
      const plugin = type ? getWidgetPlugin(type) : undefined;
      if (!plugin) return item;
      const { minW, minH, maxW, maxH } = plugin.defaultLayout;
      return {
        ...item,
        minW,
        minH,
        maxW,
        maxH,
        w: Math.min(maxW, Math.max(minW, item.w)),
        h: Math.min(maxH, Math.max(minH, item.h)),
      };
    });
  }, [layout, widgets]);
  const displayLayout = useMemo(
    () => resolveLayoutCollisions(constrainedLayout, cols, null, DEFAULT_VECTOR),
    [constrainedLayout, cols],
  );
  const rows = Math.max(availableRows, previewRows ?? getLayoutBottom(displayLayout));
  const workspaceHeight = rows * UNIT;
  const showGrid = editing || showGridLines;

  return (
    <div ref={containerRef}>
      {widgets.length === 0 ? (
        <div
          style={{ minHeight: workspaceHeight }}
          className="text-muted-foreground/60 grid place-items-center text-sm"
        >
          Your dashboard is empty. Use Add widget in the header to get started.
        </div>
      ) : (
        mounted && (
          <div style={{ width: gw }} className="mx-auto">
            <GridLayout
              width={gw}
              layout={displayLayout}
              gridConfig={{
                cols,
                rowHeight: CELL,
                margin: [GAP, GAP],
                containerPadding: [PAD, PAD],
              }}
              compactor={compactor}
              dragConfig={{ enabled: editing, cancel: "button, a, input, textarea" }}
              resizeConfig={{ enabled: editing, handles: ["se"] }}
              onDragStart={handleStart}
              onDrag={handleMove}
              onDragStop={handleStop}
              onResizeStart={handleStart}
              onResize={handleMove}
              onResizeStop={handleStop}
              style={
                {
                  minHeight: workspaceHeight,
                  ...(showGrid ? { "--cell": `${UNIT}px` } : {}),
                } as CSSProperties
              }
              className={cn(showGrid && "grid-lines")}
            >
              {widgets.map((widget) => {
                const item = displayLayout.find((entry) => entry.i === widget.id);
                const size =
                  liveSize?.id === widget.id
                    ? { w: liveSize.w, h: liveSize.h }
                    : item
                      ? { w: item.w, h: item.h }
                      : undefined;
                return (
                  <div key={widget.id}>
                    <WidgetHost instance={widget} editing={editing} size={size} />
                  </div>
                );
              })}
            </GridLayout>
          </div>
        )
      )}
    </div>
  );
}
