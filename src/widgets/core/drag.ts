import type { Layout } from "react-grid-layout";
import { GAP, PAD, UNIT } from "@/widgets/core/grid";
import { findNearestOpenPosition } from "@/widgets/core/layout-engine";
import type { WidgetPlugin } from "@/widgets/core/types";
import type { DragGeometry, DragRect } from "@/widgets/core/useWidgetDragStore";

export function isOverGrid(x: number, y: number, geometry: DragGeometry): boolean {
  return x >= geometry.left && x <= geometry.left + geometry.cols * UNIT && y >= geometry.top;
}

function pointerToCell(
  x: number,
  y: number,
  geometry: DragGeometry,
  w: number,
  h: number,
): { col: number; row: number } {
  const widthPx = w * UNIT - GAP;
  const heightPx = h * UNIT - GAP;
  const col = Math.round((x - geometry.left - PAD - widthPx / 2) / UNIT);
  const row = Math.round((y - geometry.top - PAD - heightPx / 2) / UNIT);
  return {
    col: Math.max(0, Math.min(col, geometry.cols - w)),
    row: Math.max(0, row),
  };
}

function cellRect(
  col: number,
  row: number,
  w: number,
  h: number,
  geometry: DragGeometry,
): DragRect {
  return {
    x: geometry.left + PAD + col * UNIT,
    y: geometry.top + PAD + row * UNIT,
    w: w * UNIT - GAP,
    h: h * UNIT - GAP,
  };
}

export function resolveDrop(
  plugin: WidgetPlugin,
  layout: Layout,
  x: number,
  y: number,
  geometry: DragGeometry,
): { spot: { x: number; y: number }; rect: DragRect } {
  const w = plugin.defaultLayout.w;
  const h = plugin.defaultLayout.h;
  const { col, row } = pointerToCell(x, y, geometry, w, h);
  const open = findNearestOpenPosition({ i: plugin.type, x: col, y: row, w, h }, layout, geometry.cols);
  return { spot: { x: open.x, y: open.y }, rect: cellRect(open.x, open.y, w, h, geometry) };
}
