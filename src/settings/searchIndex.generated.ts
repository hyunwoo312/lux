import type { SettingsTab } from "@/settings/tabsMeta";

export type GeneratedSetting = {
  label: string;
  section: string;
  tab: SettingsTab;
  description: string;
};

export const GENERATED_SETTINGS: GeneratedSetting[] = [
  {
    label: "Privacy",
    section: "Privacy",
    tab: "about",
    description: "",
  },
  {
    label: "24-hour time",
    section: "Dashboard",
    tab: "appearance",
    description: "Use a 24-hour clock instead of AM/PM.",
  },
  {
    label: "Grid lines",
    section: "Dashboard",
    tab: "appearance",
    description: "Always show the dashboard grid, not only while editing.",
  },
  {
    label: "Accent",
    section: "Theme",
    tab: "appearance",
    description: "The highlight colour used across Lux.",
  },
  {
    label: "Light or dark",
    section: "Theme",
    tab: "appearance",
    description: "Follow your system setting, or pick one.",
  },
  {
    label: "Fit",
    section: "Wallpaper",
    tab: "appearance",
    description: "How the image fills the screen",
  },
  {
    label: "Intensity",
    section: "Wallpaper",
    tab: "appearance",
    description: "How strong the pattern reads",
  },
  {
    label: "Mode",
    section: "Wallpaper",
    tab: "appearance",
    description: "One wallpaper or a rotating set",
  },
  {
    label: "Motion",
    section: "Wallpaper",
    tab: "appearance",
    description: "",
  },
  {
    label: "Overlay",
    section: "Wallpaper",
    tab: "appearance",
    description: "Darken or blur for legibility",
  },
  {
    label: "Shapes",
    section: "Wallpaper",
    tab: "appearance",
    description: "How many polygons the mesh draws",
  },
  {
    label: "Speed",
    section: "Wallpaper",
    tab: "appearance",
    description: "How quickly the bands travel",
  },
  {
    label: "Style",
    section: "Wallpaper",
    tab: "appearance",
    description: "Drawn by Lux, so it always matches your theme",
  },
  {
    label: "Type",
    section: "Wallpaper",
    tab: "appearance",
    description: "A pattern Lux draws, one of ours, or an image of your own",
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
      "Clears theme, shortcuts and background images. Widgets, their content and your accounts are kept.",
  },
  {
    label: "What Lux is storing",
    section: "What Lux is storing",
    tab: "storage",
    description: "",
  },
];
