export type Theme = "light" | "dark";

const STORAGE_KEY = "lux.theme";
const DEFAULT_THEME: Theme = "dark";

export function getStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage may be unavailable (private mode, blocked); the applied class still holds
    // for this session, so this is non-fatal.
  }
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

// Applies and persists the theme. When `animate` is set, uses the View Transitions API
// so the new theme wipes in left-to-right (see the keyframes in globals.css); falls back
// to an instant switch when the API is missing or reduced motion is requested.
export function applyTheme(theme: Theme, animate: boolean): void {
  persistTheme(theme);
  const doc = document as DocumentWithViewTransition;
  if (animate && doc.startViewTransition && !prefersReducedMotion()) {
    doc.startViewTransition(() => applyThemeClass(theme));
  } else {
    applyThemeClass(theme);
  }
}
