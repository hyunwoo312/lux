import { create } from "zustand";
import type { WidgetType } from "@/widgets/core/types";

type WidgetPaletteState = {
  open: boolean;
  previewType: WidgetType | null;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setPreviewType: (previewType: WidgetType | null) => void;
};

export const useWidgetPaletteStore = create<WidgetPaletteState>((set) => ({
  open: false,
  previewType: null,
  setOpen: (open) => set(open ? { open } : { open, previewType: null }),
  toggle: () => set((state) => ({ open: !state.open, previewType: null })),
  setPreviewType: (previewType) => set({ previewType }),
}));
