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

type WipeOrigin = { x: number; y: number };

const WIPE_BASE_MS = 800;
const WIPE_MAX_MS = 1000;

function triggerOrigin(): WipeOrigin {
  const rect = document.activeElement?.getBoundingClientRect();
  if (rect && rect.width > 0 && rect.height > 0) {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

function swallowStrayPointer(event: Event): void {
  if (event.target === document.documentElement) event.stopPropagation();
}

function setWipeOrigin(origin: WipeOrigin): void {
  const { innerWidth: width, innerHeight: height } = window;
  const radius = Math.hypot(
    Math.max(origin.x, width - origin.x),
    Math.max(origin.y, height - origin.y),
  );
  const centreRadius = Math.hypot(width, height) / 2;
  const duration = Math.min(WIPE_MAX_MS, WIPE_BASE_MS * Math.sqrt(radius / centreRadius));
  const root = document.documentElement;
  root.style.setProperty("--wipe-x", `${origin.x}px`);
  root.style.setProperty("--wipe-y", `${origin.y}px`);
  root.style.setProperty("--wipe-radius", `${Math.ceil(radius)}px`);
  root.style.setProperty("--wipe-duration", `${Math.round(duration)}ms`);
}

export function transitionThemeClass(theme: ResolvedTheme): void {
  const doc = document as DocumentWithViewTransition;
  if (!doc.startViewTransition || prefersReducedMotion()) {
    applyThemeClass(theme);
    return;
  }
  setWipeOrigin(triggerOrigin());
  activeTransition?.skipTransition?.();
  const root = document.documentElement;
  const generation = ++transitionGeneration;
  root.classList.add(WIPE_MARKER);
  const transition = doc.startViewTransition(() => applyThemeClass(theme));
  activeTransition = transition;
  document.addEventListener("pointerdown", swallowStrayPointer, true);
  const done = () => {
    if (generation !== transitionGeneration) return;
    activeTransition = null;
    document.removeEventListener("pointerdown", swallowStrayPointer, true);
    root.classList.remove(WIPE_MARKER);
  };
  if (transition.finished) {
    void transition.finished.then(done, done);
  } else {
    done();
  }
}

export function applyTheme(mode: ThemeMode): { theme: ResolvedTheme; isPersisted: boolean } {
  const isPersisted = setLocal(THEME_STORAGE_KEY, mode);
  const theme = resolveTheme(mode);
  transitionThemeClass(theme);
  return { theme, isPersisted };
}
