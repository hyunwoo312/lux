import { getLocal, setLocal } from "@/lib/local-store";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "lux.theme";
const DEFAULT_MODE: ThemeMode = "dark";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function getStoredMode(): ThemeMode {
  const value = getLocal(THEME_STORAGE_KEY);
  return isThemeMode(value) ? value : DEFAULT_MODE;
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? systemTheme() : mode;
}

export function applyThemeClass(theme: ResolvedTheme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function watchSystemTheme(onChange: (theme: ResolvedTheme) => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  const listener = (event: MediaQueryListEvent) => onChange(event.matches ? "dark" : "light");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

type ViewTransition = { finished?: Promise<unknown>; skipTransition?: () => void };
type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransition;
};

const WIPE_MARKER = "theme-switching";
let activeTransition: ViewTransition | null = null;
let transitionGeneration = 0;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type WipeOrigin = { x: number; y: number };

function setWipeOrigin(origin: WipeOrigin): void {
  const { innerWidth: width, innerHeight: height } = window;
  const radius = Math.hypot(
    Math.max(origin.x, width - origin.x),
    Math.max(origin.y, height - origin.y),
  );
  const root = document.documentElement;
  root.style.setProperty("--wipe-x", `${origin.x}px`);
  root.style.setProperty("--wipe-y", `${origin.y}px`);
  root.style.setProperty("--wipe-radius", `${Math.ceil(radius)}px`);
}

export function transitionThemeClass(theme: ResolvedTheme, origin?: WipeOrigin): void {
  const doc = document as DocumentWithViewTransition;
  if (!doc.startViewTransition || prefersReducedMotion()) {
    applyThemeClass(theme);
    return;
  }
  setWipeOrigin(origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 });
  activeTransition?.skipTransition?.();
  const root = document.documentElement;
  const generation = ++transitionGeneration;
  root.classList.add(WIPE_MARKER);
  const transition = doc.startViewTransition(() => applyThemeClass(theme));
  activeTransition = transition;
  const done = () => {
    if (generation !== transitionGeneration) return;
    activeTransition = null;
    root.classList.remove(WIPE_MARKER);
  };
  if (transition.finished) {
    void transition.finished.then(done, done);
  } else {
    done();
  }
}

export function applyTheme(mode: ThemeMode, animate: boolean, origin?: WipeOrigin): boolean {
  const isPersisted = setLocal(THEME_STORAGE_KEY, mode);
  const theme = resolveTheme(mode);
  if (animate) {
    transitionThemeClass(theme, origin);
  } else {
    applyThemeClass(theme);
  }
  return isPersisted;
}
