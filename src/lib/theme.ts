import { getLocal, setLocal } from "@/lib/local-store";

export type Theme = "light" | "dark";

const STORAGE_KEY = "lux.theme";
const DEFAULT_THEME: Theme = "dark";

export function getStoredTheme(): Theme {
  const value = getLocal(STORAGE_KEY);
  return value === "light" || value === "dark" ? value : DEFAULT_THEME;
}

function persistTheme(theme: Theme): void {
  setLocal(STORAGE_KEY, theme);
}

export function applyThemeClass(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => unknown;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function applyTheme(theme: Theme, animate: boolean): void {
  persistTheme(theme);
  const doc = document as DocumentWithViewTransition;
  if (animate && doc.startViewTransition && !prefersReducedMotion()) {
    doc.startViewTransition(() => applyThemeClass(theme));
  } else {
    applyThemeClass(theme);
  }
}
