import { create } from "zustand";
import type { CommandItem } from "@/commands";

type ScopeCommand = Extract<CommandItem, { effect: "scope" }>;

export type PaletteMode = { kind: "root" } | { kind: "scope"; command: ScopeCommand };

type CommandPaletteState = {
  open: boolean;
  query: string;
  mode: PaletteMode;
  openPalette: () => void;
  closePalette: () => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  enterScope: (command: ScopeCommand) => void;
  leaveScope: () => void;
};

const ROOT: PaletteMode = { kind: "root" };

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  query: "",
  mode: ROOT,
  openPalette: () => set({ open: true, query: "", mode: ROOT }),
  closePalette: () => set({ open: false, query: "", mode: ROOT }),
  toggle: () =>
    set((state) =>
      state.open ? { open: false, query: "", mode: ROOT } : { open: true, query: "", mode: ROOT },
    ),
  setQuery: (query) => set({ query }),
  enterScope: (command) => set({ mode: { kind: "scope", command }, query: "" }),
  leaveScope: () => set({ mode: ROOT, query: "" }),
}));
