import type { CSSProperties, Ref } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { GridLayout, useContainerWidth, setTopLeft } from "react-grid-layout";
import type { Compactor, EventCallback, Position } from "react-grid-layout";
import { cn } from "@/lib/utils";
import { CELL, GAP, gridColumns, gridWidth, PAD, UNIT } from "@/widgets/core/grid";
import {
  applyDragWithinNarrowView,
  clampLayout,
  layoutColumnSpan,
  findFirstOpenPosition,
  getLayoutBottom,
  resolveLayoutCollisions,
  resolveLocalDisplacement,
} from "@/widgets/core/layout-engine";
import { getScrollParent, useEdgeAutoScroll } from "@/widgets/core/useEdgeAutoScroll";
import { useWidgetDragStore } from "@/widgets/core/useWidgetDragStore";
import { WidgetHost } from "@/widgets/core/WidgetHost";
import { getWidgetPlugin } from "@/widgets/registry";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useWidgetPaletteStore } from "@/stores/useWidgetPaletteStore";

const topLeftStrategy = {
  type: "absolute",
  scale: 1,
  calcStyle: (pos: Position) => setTopLeft(pos) as CSSProperties,
} as const;

const RESIZE_HANDLES = ["n", "s", "w", "e", "nw", "ne", "sw", "se"] as const;

const compactor: Compactor = {
  type: null,
  allowOverlap: true,
  preventCollision: false,
  compact: clampLayout,
};

const MIN_ROWS = 8;
const EDIT_ROW_BUFFER = 1;
const BOTTOM_GUTTER = 16;

export function WidgetGrid() {
  const widgets = useDashboardStore((s) => s.widgets);
  const layout = useDashboardStore((s) => s.layout);
  const editing = useDashboardStore((s) => s.editing);
  const showGridLines = useAppSettingsStore((s) => s.showGridLines);
  const setLayout = useDashboardStore((s) => s.setLayout);
  const setColumns = useDashboardStore((s) => s.setColumns);
  const setGeometry = useWidgetDragStore((s) => s.setGeometry);
  const dragging = useWidgetDragStore((s) => s.type !== null);
  const previewType = useWidgetPaletteStore((s) => s.previewType);
  const paletteOpen = useWidgetPaletteStore((s) => s.open);
  const reduced = useReducedMotion();
  const previewRef = useRef<HTMLDivElement>(null);
  const { width, mounted, containerRef } = useContainerWidth();

  const [previewRows, setPreviewRows] = useState<number | null>(null);
  const [liveSize, setLiveSize] = useState<{ id: string; w: number; h: number } | null>(null);
  const [availableRows, setAvailableRows] = useState(MIN_ROWS);
  const activeWidgetId = useRef<string | null>(null);
  const edgeScroll = useEdgeAutoScroll();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const scroller = getScrollParent(el);
      const available = scroller
        ? scroller.clientHeight - BOTTOM_GUTTER
        : window.innerHeight - el.getBoundingClientRect().top - BOTTOM_GUTTER;
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

  const handleStart: EventCallback = (_layout, _oldItem, newItem, _placeholder, event) => {
    if (!newItem) return;
    activeWidgetId.current = newItem.i;
    edgeScroll.begin(containerRef.current);
    if (event instanceof MouseEvent) edgeScroll.track(event.clientY);
  };

  const handleMove: EventCallback = (next, _oldItem, newItem, _placeholder, event) => {
    if (newItem)
      setLiveSize((prev) =>
        prev && prev.id === newItem.i && prev.w === newItem.w && prev.h === newItem.h
          ? prev
          : { id: newItem.i, w: newItem.w, h: newItem.h },
      );
    if (event instanceof MouseEvent) edgeScroll.track(event.clientY);
    setPreviewRows(getLayoutBottom(next) + EDIT_ROW_BUFFER);
  };

  const handleStop: EventCallback = (next) => {
    setPreviewRows(null);
    setLiveSize(null);
    edgeScroll.end();
    const draggedId = activeWidgetId.current;
    const basis = Math.max(cols, layoutColumnSpan(layout));
    const merged = applyDragWithinNarrowView(layout, next, draggedId, cols);
    const displaced = resolveLocalDisplacement(merged, basis, draggedId);
    const cleaned = resolveLayoutCollisions(displaced, basis, draggedId);
    activeWidgetId.current = null;
    setLayout(cleaned);
  };

  const constrainedLayout = useMemo(() => {
    const typeById = new Map(widgets.map((widget) => [widget.id, widget.type]));
    return layout.map((item) => {
      const type = typeById.get(item.i);
      if (!type) return item;
      const { minW, minH, maxW, maxH } = getWidgetPlugin(type).defaultLayout;
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
    () => resolveLayoutCollisions(constrainedLayout, cols, null),
    [constrainedLayout, cols],
  );
  const previewPlacement = useMemo(() => {
    if (!previewType) return null;
    const { w, h } = getWidgetPlugin(previewType).defaultLayout;
    const spot = findFirstOpenPosition({ i: "__preview__", x: 0, y: 0, w, h }, displayLayout, cols);
    return { x: spot.x, y: spot.y, w, h };
  }, [previewType, displayLayout, cols]);
  const previewBottom = previewPlacement ? previewPlacement.y + previewPlacement.h : 0;
  const previewFloor = useRef(0);
  if (!paletteOpen) previewFloor.current = 0;
  else if (previewBottom > previewFloor.current) previewFloor.current = previewBottom;
  const rows = Math.max(
    availableRows,
    previewRows ?? getLayoutBottom(displayLayout),
    previewFloor.current,
  );
  const workspaceHeight = rows * UNIT;
  const showGrid = editing || showGridLines;

  const previewKey = previewPlacement ? `${previewPlacement.x},${previewPlacement.y}` : null;
  useEffect(() => {
    if (!previewKey) return;
    previewRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
  }, [previewKey, reduced]);

  return (
    <div ref={containerRef}>
      {widgets.length === 0 ? (
        <div
          style={{ minHeight: workspaceHeight }}
          className="text-ink-3 grid place-items-center text-body"
        >
          {previewPlacement && mounted ? (
            <div className="relative" style={{ width: gw, height: workspaceHeight }}>
              <PlacementPreview placement={previewPlacement} ref={previewRef} />
            </div>
          ) : (
            "Your dashboard is empty. Use Add widget in the header to get started."
          )}
        </div>
      ) : (
        mounted && (
          <div style={{ width: gw }} className="relative mx-auto">
            <GridLayout
              width={gw}
              layout={displayLayout}
              positionStrategy={topLeftStrategy}
              gridConfig={{
                cols,
                rowHeight: CELL,
                margin: [GAP, GAP],
                containerPadding: [PAD, PAD],
              }}
              compactor={compactor}
              dragConfig={{ enabled: editing, cancel: "button, a, input, textarea" }}
              resizeConfig={{ enabled: editing, handles: RESIZE_HANDLES }}
              onDragStart={handleStart}
              onDrag={handleMove}
              onDragStop={handleStop}
              onResizeStart={handleStart}
              onResize={handleMove}
              onResizeStop={handleStop}
              style={
                {
                  minHeight: workspaceHeight,
                  ...(showGrid ? { "--grid-unit": `${UNIT}px` } : {}),
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
                  <div
                    key={widget.id}
                    className={cn(editing && "cursor-grab active:cursor-grabbing")}
                  >
                    <WidgetHost instance={widget} editing={editing} size={size} />
                  </div>
                );
              })}
            </GridLayout>
            {previewPlacement && <PlacementPreview placement={previewPlacement} ref={previewRef} />}
          </div>
        )
      )}
    </div>
  );
}

type Placement = { x: number; y: number; w: number; h: number };

function PlacementPreview({ placement, ref }: { placement: Placement; ref?: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        left: PAD + placement.x * UNIT,
        top: PAD + placement.y * UNIT,
        width: placement.w * UNIT - GAP,
        height: placement.h * UNIT - GAP,
      }}
      className={cn(
        `
          border-primary bg-primary/15 pointer-events-none absolute rounded-2xl border-2
          border-dashed
        `,
        "shadow-glow-accent",
      )}
    />
  );
}
