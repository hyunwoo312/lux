import type { ComponentType } from "react";
import { Database, Keyboard, LayoutGrid, Palette, Search, ShieldCheck } from "lucide-react";
import { LuxMark } from "@/components/LuxMark";

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

type SettingsTabMeta = {
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export const SETTINGS_TAB_META: Record<SettingsTab, SettingsTabMeta> = {
  appearance: { label: "Appearance", icon: Palette },
  widgets: { label: "Widgets", icon: LayoutGrid },
  accounts: { label: "Accounts & Permissions", icon: ShieldCheck },
  shortcuts: { label: "Shortcuts", icon: Keyboard },
  palette: { label: "Command palette", icon: Search },
  storage: { label: "Storage & Backup", icon: Database },
  about: { label: "About", icon: LuxMark },
};
