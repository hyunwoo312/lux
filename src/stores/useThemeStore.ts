import { create } from "zustand";
import {
  applyTheme,
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
};

const initialMode = getStoredMode();

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  theme: resolveTheme(initialMode),
  isPersisted: true,
  setMode: (mode) => {
    set({ mode, theme: resolveTheme(mode), isPersisted: applyTheme(mode, true) });
  },
  toggle: () => {
    const next: ThemeMode = get().theme === "dark" ? "light" : "dark";
    set({ mode: next, theme: next, isPersisted: applyTheme(next, true) });
  },
}));

watchSystemTheme((theme) => {
  if (useThemeStore.getState().mode !== "system") return;
  useThemeStore.setState({ theme });
  transitionThemeClass(theme);
});
