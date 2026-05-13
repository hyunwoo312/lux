import { create } from "zustand";
import type { WidgetType } from "@/widgets/core/types";

type WidgetHighlightState = {
  highlighted: WidgetType | null;
  setHighlighted: (type: WidgetType | null) => void;
};

export const useWidgetHighlightStore = create<WidgetHighlightState>((set) => ({
  highlighted: null,
  setHighlighted: (highlighted) => set({ highlighted }),
}));
