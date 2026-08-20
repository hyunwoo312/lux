import { create } from "zustand";
import {
  applyTheme,
  getStoredMode,
  resolveTheme,
  transitionThemeClass,
  watchSystemTheme,
  type ResolvedTheme,
  type ThemeMode,
  type WipeOrigin,
} from "@/lib/theme";

type ThemeState = {
  mode: ThemeMode;
  theme: ResolvedTheme;
  isPersisted: boolean;
  setMode: (mode: ThemeMode, origin?: WipeOrigin) => void;
  toggle: (origin?: WipeOrigin) => void;
};

const initialMode = getStoredMode();

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  theme: resolveTheme(initialMode),
  isPersisted: true,
  setMode: (mode, origin) => {
    set({ mode, theme: resolveTheme(mode), isPersisted: applyTheme(mode, true, origin) });
  },
  toggle: (origin) => {
    const next: ThemeMode = get().theme === "dark" ? "light" : "dark";
    set({ mode: next, theme: next, isPersisted: applyTheme(next, true, origin) });
  },
}));

watchSystemTheme((theme) => {
  if (useThemeStore.getState().mode !== "system") return;
  useThemeStore.setState({ theme });
  transitionThemeClass(theme);
});
