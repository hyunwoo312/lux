import { create } from "zustand";
import {
  applyTheme,
  DEFAULT_MODE,
  getStoredMode,
  resolveTheme,
  transitionThemeClass,
  watchSystemTheme,
  type ResolvedTheme,
  type ThemeMode,
} from "@/lib/theme";

type ThemeState = {
  mode: ThemeMode;
  theme: ResolvedTheme;
  isPersisted: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  reset: () => void;
};

const initialMode = getStoredMode();

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  theme: resolveTheme(initialMode),
  isPersisted: true,
  setMode: (mode) => {
    set({ mode, ...applyTheme(mode) });
  },
  toggle: () => {
    const next: ThemeMode = get().theme === "dark" ? "light" : "dark";
    set({ mode: next, ...applyTheme(next) });
  },
  reset: () => {
    set({ mode: DEFAULT_MODE, ...applyTheme(DEFAULT_MODE) });
  },
}));

watchSystemTheme((theme) => {
  if (useThemeStore.getState().mode !== "system") return;
  useThemeStore.setState({ theme });
  transitionThemeClass(theme);
});
