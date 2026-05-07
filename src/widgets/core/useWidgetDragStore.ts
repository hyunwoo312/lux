import { create } from "zustand";
import type { WidgetType } from "@/widgets/core/types";

export type DragGeometry = { left: number; top: number; cols: number };
export type DragRect = { x: number; y: number; w: number; h: number };
export type DropMorph = { type: WidgetType; from: DragRect; to: DragRect };

type WidgetDragStore = {
  type: WidgetType | null;
  pointerX: number;
  pointerY: number;
  ghostW: number;
  ghostH: number;
  geometry: DragGeometry | null;
  dropMorph: DropMorph | null;
  setGeometry: (geometry: DragGeometry | null) => void;
  start: (type: WidgetType, x: number, y: number, ghostW: number, ghostH: number) => void;
  move: (x: number, y: number) => void;
  cancel: () => void;
  drop: (morph: DropMorph) => void;
  endMorph: () => void;
};

export const useWidgetDragStore = create<WidgetDragStore>((set) => ({
  type: null,
  pointerX: 0,
  pointerY: 0,
  ghostW: 0,
  ghostH: 0,
  geometry: null,
  dropMorph: null,
  setGeometry: (geometry) => set({ geometry }),
  start: (type, x, y, ghostW, ghostH) =>
    set({ type, pointerX: x, pointerY: y, ghostW, ghostH }),
  move: (x, y) => set({ pointerX: x, pointerY: y }),
  cancel: () => set({ type: null }),
  drop: (morph) => set({ type: null, dropMorph: morph }),
  endMorph: () => set({ dropMorph: null }),
}));
