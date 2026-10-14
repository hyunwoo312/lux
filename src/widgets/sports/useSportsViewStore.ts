import { create } from "zustand";
import { patchInstance, dropInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import type { Match } from "@/widgets/sports/types";

type SportsView = {
  query: string;
  searchOpen: boolean;
  panel: "leagues" | null;
  date: string | null;
  selected: { leagueId: string; match: Match } | null;
};
const DEFAULT_VIEW: SportsView = {
  query: "",
  searchOpen: false,
  panel: null,
  date: null,
  selected: null,
};
type ViewStore = {
  byInstance: Record<string, SportsView>;
  setView: (id: string, patch: Partial<SportsView>) => void;
  reset: (id: string) => void;
};

export const useSportsViewStore = create<ViewStore>((set) => ({
  byInstance: {},
  setView: (id, patch) =>
    set((state) => ({
      byInstance: patchInstance(state.byInstance, id, DEFAULT_VIEW, (view) => ({
        ...view,
        ...patch,
      })),
    })),
  reset: (id) => set((state) => ({ byInstance: dropInstance(state.byInstance, id) })),
}));
export const useSportsView = createInstanceSelector(useSportsViewStore, DEFAULT_VIEW);
