import { create } from "zustand";
import { getLocal, removeLocal, setLocal } from "@/lib/local-store";
import { accentClass, isAccentName, type AccentName } from "@/widgets/core/accent";

const ACCENT_STORAGE_KEY = "lux.accent";
const DEFAULT_ACCENT: AccentName = "violet";

type AccentState = {
  accent: AccentName;
  setAccent: (accent: AccentName) => void;
  reset: () => void;
};

export function getStoredAccent(): AccentName {
  const value = getLocal(ACCENT_STORAGE_KEY);
  return isAccentName(value) ? value : DEFAULT_ACCENT;
}

export function applyAccentClass(accent: AccentName): void {
  const root = document.documentElement;
  root.classList.forEach((name) => {
    if (name.startsWith("accent-")) root.classList.remove(name);
  });
  const next = accentClass(accent);
  if (next) root.classList.add(next);
}

export const useAccentStore = create<AccentState>((set) => ({
  accent: getStoredAccent(),
  setAccent: (accent) => {
    applyAccentClass(accent);
    setLocal(ACCENT_STORAGE_KEY, accent);
    set({ accent });
  },
  reset: () => {
    removeLocal(ACCENT_STORAGE_KEY);
    applyAccentClass(DEFAULT_ACCENT);
    set({ accent: DEFAULT_ACCENT });
  },
}));
