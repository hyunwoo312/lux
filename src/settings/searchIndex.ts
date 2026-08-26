import { PROVIDERS } from "@/settings/providers";
import { PERMISSIONS } from "@/settings/permissions";
import type { SettingsTab } from "@/settings/tabsMeta";
import { SHORTCUT_DEFINITIONS } from "@/stores/shortcutDefinitions";
import { widgetPlugins } from "@/widgets/registry";

export type SettingEntry = {
  label: string;
  section: string;
  tab: SettingsTab;
  description: string;
};

const WRITTEN_SETTINGS: SettingEntry[] = [
  {
    label: "Privacy",
    section: "Privacy",
    tab: "about",
    description: "What Lux stores, what it sends, and what it never collects.",
  },
  {
    label: "Light or dark",
    section: "Theme",
    tab: "appearance",
    description: "Follow your system setting, or pick one.",
  },
  {
    label: "Accent",
    section: "Theme",
    tab: "appearance",
    description: "The highlight colour used across Lux.",
  },
  {
    label: "Type",
    section: "Wallpaper",
    tab: "appearance",
    description: "A pattern Lux draws, one of ours, or an image of your own",
  },
  {
    label: "Style",
    section: "Wallpaper",
    tab: "appearance",
    description: "Drawn by Lux, so it always matches your theme",
  },
  {
    label: "Motion",
    section: "Wallpaper",
    tab: "appearance",
    description: "Slow drift, paused when the tab is hidden",
  },
  {
    label: "Intensity",
    section: "Wallpaper",
    tab: "appearance",
    description: "How strong the pattern reads",
  },
  {
    label: "Speed",
    section: "Wallpaper",
    tab: "appearance",
    description: "How quickly the bands travel",
  },
  {
    label: "Shapes",
    section: "Wallpaper",
    tab: "appearance",
    description: "How many polygons the mesh draws",
  },
  {
    label: "Mode",
    section: "Wallpaper",
    tab: "appearance",
    description: "One wallpaper or a rotating set",
  },
  {
    label: "Fit",
    section: "Wallpaper",
    tab: "appearance",
    description: "How the image fills the screen",
  },
  {
    label: "Overlay",
    section: "Wallpaper",
    tab: "appearance",
    description: "Darken or blur for legibility",
  },
  {
    label: "Grid lines",
    section: "Dashboard",
    tab: "appearance",
    description: "Always show the dashboard grid, not only while editing.",
  },
  {
    label: "Clock",
    section: "Dashboard",
    tab: "appearance",
    description: "Show the time in the header.",
  },
  {
    label: "24-hour time",
    section: "Dashboard",
    tab: "appearance",
    description: "Use a 24-hour clock instead of AM/PM.",
  },
  {
    label: "Date under the clock",
    section: "Dashboard",
    tab: "appearance",
    description: "Add the weekday, the date, or both.",
  },
  {
    label: "Surface",
    section: "Defaults for every widget",
    tab: "widgets",
    description: "Glass or solid for every widget at once.",
  },
  {
    label: "How often widgets refresh",
    section: "Refresh and data",
    tab: "widgets",
    description: "Relaxed halves every widget's rate.",
  },
  {
    label: "Your whole setup, in one file",
    section: "Backup & restore",
    tab: "storage",
    description: "Widgets, layout, preferences and shortcuts. Accounts are not included.",
  },
  {
    label: "Reset all settings",
    section: "Start over",
    tab: "storage",
    description:
      "Clears theme, shortcuts and background images, and shows the welcome again. Widgets, their content and your accounts are kept.",
  },
  {
    label: "What Lux is storing",
    section: "What Lux is storing",
    tab: "storage",
    description: "How much room each part of Lux is using.",
  },
];

let cached: SettingEntry[] | null = null;

export function settingsIndex(): SettingEntry[] {
  if (cached) return cached;

  cached = [
    ...WRITTEN_SETTINGS,
    ...widgetPlugins.map((plugin) => ({
      label: plugin.name,
      section: "Widgets",
      tab: "widgets" as const,
      description: plugin.description,
    })),
    ...PROVIDERS.map((provider) => ({
      label: provider.label,
      section: "Accounts",
      tab: "accounts" as const,
      description: provider.description,
    })),
    ...PERMISSIONS.map((permission) => ({
      label: permission.name,
      section: "Permissions",
      tab: "accounts" as const,
      description: `${permission.description} Used by ${permission.usedBy}.`,
    })),
    ...SHORTCUT_DEFINITIONS.map((definition) => ({
      label: definition.label,
      section: "Shortcuts",
      tab: "shortcuts" as const,
      description: definition.description,
    })),
  ];

  return cached;
}

export function searchSettings(query: string): SettingEntry[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];

  return settingsIndex()
    .filter((entry) =>
      `${entry.label} ${entry.section} ${entry.description}`.toLowerCase().includes(needle),
    )
    .slice(0, 8);
}
