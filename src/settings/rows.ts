import type { SettingsTab } from "@/stores/settingsTabs";

type RowCopy = { title: string; description: string };

type SettingsSection = {
  tab: SettingsTab;
  title: string;
  description?: string;
  rows: Record<string, RowCopy>;
};

function section<R extends string>(
  tab: SettingsTab,
  title: string,
  rows: Record<R, RowCopy>,
  description?: string,
): SettingsSection & { rows: Record<R, RowCopy> } {
  return description === undefined ? { tab, title, rows } : { tab, title, rows, description };
}

export const THEME = section("appearance", "Theme", {
  theme: { title: "Light or dark", description: "Follow your system setting, or pick one." },
  accent: { title: "Accent", description: "The highlight colour used across Lux." },
});

export const WALLPAPER = section("appearance", "Wallpaper", {
  type: { title: "Type", description: "A pattern Lux draws, one of ours, or an image of your own" },
  style: { title: "Style", description: "Drawn by Lux, so it always matches your theme" },
  motion: { title: "Motion", description: "Slow drift, paused when the tab is hidden" },
  intensity: { title: "Intensity", description: "How strong the pattern reads" },
  speed: { title: "Speed", description: "How quickly the bands travel" },
  shapes: { title: "Shapes", description: "How many polygons the mesh draws" },
  gallery: { title: "Wallpaper", description: "Pick one" },
  image: { title: "Image", description: "PNG, JPG, WebP, or GIF up to 10 MB" },
  mode: { title: "Mode", description: "One wallpaper or a rotating set" },
  newTab: { title: "Change on new tab", description: "A different one each time you open a tab" },
  timer: {
    title: "Change on a timer",
    description: "Rotate automatically while the tab stays open",
  },
  interval: { title: "Interval", description: "How often it changes" },
  order: { title: "Order", description: "Shuffle or sequential" },
  fit: { title: "Fit", description: "How the image fills the screen" },
  overlay: { title: "Overlay", description: "Darken or blur for legibility" },
});

export const DASHBOARD = section("appearance", "Dashboard", {
  gridLines: {
    title: "Grid lines",
    description: "Always show the dashboard grid, not only while editing.",
  },
  clock: { title: "Clock", description: "Show the time in the header." },
  clock24h: { title: "24-hour time", description: "Use a 24-hour clock instead of AM/PM." },
  clockDate: { title: "Date under the clock", description: "Add the weekday, the date, or both." },
});

export const WIDGET_DEFAULTS = section("widgets", "Defaults for every widget", {
  surface: { title: "Surface", description: "Glass or solid for every widget at once." },
});

export const REFRESH = section("widgets", "Refresh and data", {
  cadence: {
    title: "How often widgets refresh",
    description: "Relaxed halves every widget's rate.",
  },
});

export const ACCOUNTS = section("accounts", "Accounts", {});

export const PERMISSION_LIST = section("accounts", "Permissions", {});

export const BROWSER_SHORTCUT = section("shortcuts", "Browser shortcut", {
  palette: {
    title: "Open the command palette",
    description: "Works from any tab; rebind it in Chrome",
  },
});

export const SHORTCUTS = section("shortcuts", "Shortcuts", {});

export const PALETTE_SUGGESTIONS = section("palette", "Suggestions", {
  suggested: {
    title: "Suggested commands",
    description: "Puts what you reach for most at the top, before everything else",
  },
  count: {
    title: "How many to show",
    description: "At the top of the palette before anything else",
  },
  learned: {
    title: "Learned ranking",
    description: "Clear the ranking the command palette has learned from what you run",
  },
});

export const PALETTE_RESULTS = section("palette", "Results", {
  openIn: {
    title: "Where results open",
    description: "Whether picking a link or a search replaces this tab",
  },
});

export const PALETTE_SOURCES_SECTION = section("palette", "Browser data and search", {});

export const PALETTE_COMMANDS = section(
  "palette",
  "Commands",
  {},
  "Everything the palette can offer. Uncheck what you would rather it never showed.",
);

export const STORING = section(
  "storage",
  "What Lux is storing",
  {},
  "How much room each part of Lux is using.",
);

export const BACKUP = section("storage", "Backup & restore", {
  file: {
    title: "Your whole setup, in one file",
    description: "Widgets, layout, preferences and shortcuts. Accounts are not included.",
  },
});

export const START_OVER = section("storage", "Start over", {
  reset: {
    title: "Reset all settings",
    description:
      "Clears theme, accent, shortcuts, palette preferences and background images, and shows the welcome again. Widgets, their content and your accounts are kept.",
  },
});

export const PRIVACY = section(
  "about",
  "Privacy",
  {},
  "What Lux stores, what it sends, and what it never collects.",
);

export const SETTINGS_SECTIONS: SettingsSection[] = [
  THEME,
  WALLPAPER,
  DASHBOARD,
  WIDGET_DEFAULTS,
  REFRESH,
  ACCOUNTS,
  PERMISSION_LIST,
  BROWSER_SHORTCUT,
  SHORTCUTS,
  PALETTE_SUGGESTIONS,
  PALETTE_RESULTS,
  PALETTE_SOURCES_SECTION,
  PALETTE_COMMANDS,
  STORING,
  BACKUP,
  START_OVER,
  PRIVACY,
];
