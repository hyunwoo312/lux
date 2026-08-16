import { create } from "zustand";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";

type ThemeState = {
  theme: Theme;
  isPersisted: boolean;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getStoredTheme(),
  isPersisted: true,
  setTheme: (theme) => {
    set({ theme, isPersisted: applyTheme(theme, true) });
  },
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    set({ theme: next, isPersisted: applyTheme(next, true) });
  },
}));
