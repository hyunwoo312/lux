import type { LayoutItem } from "react-grid-layout";
import { clamp } from "@/lib/utils";

export function keyboardLayoutItem(
  item: LayoutItem,
  key: string,
  resize: boolean,
  columns: number,
): LayoutItem | null {
  const dx = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
  const dy = key === "ArrowDown" ? 1 : key === "ArrowUp" ? -1 : 0;
  if (dx === 0 && dy === 0) return null;
  if (!resize)
    return {
      ...item,
      x: clamp(item.x + dx, 0, Math.max(0, columns - item.w)),
      y: Math.max(0, item.y + dy),
    };
  const minW = item.minW ?? 1;
  const w = clamp(item.w + dx, minW, Math.max(minW, Math.min(item.maxW ?? columns, columns)));
  return {
    ...item,
    w,
    h: clamp(item.h + dy, item.minH ?? 1, item.maxH ?? Number.MAX_SAFE_INTEGER),
    x: Math.min(item.x, Math.max(0, columns - w)),
  };
}
