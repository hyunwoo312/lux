export const SETTINGS_TABS = [
  "appearance",
  "widgets",
  "accounts",
  "shortcuts",
  "palette",
  "storage",
  "about",
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];
