import type { ComponentType } from "react";
import { CircleHelp, Keyboard, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { LuxMark } from "@/components/LuxMark";

export const SETTINGS_TABS = ["general", "accounts", "shortcuts", "help", "about"] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

export type SettingsTabMeta = {
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

export const SETTINGS_TAB_META: Record<SettingsTab, SettingsTabMeta> = {
  general: {
    label: "General",
    description: "App-wide preferences",
    icon: SlidersHorizontal,
  },
  accounts: {
    label: "Accounts & Permissions",
    description: "Connected accounts and extension permissions",
    icon: ShieldCheck,
  },
  shortcuts: {
    label: "Shortcuts",
    description: "Keyboard shortcuts",
    icon: Keyboard,
  },
  help: {
    label: "Help",
    description: "Guides, shortcuts, and FAQ",
    icon: CircleHelp,
  },
  about: {
    label: "About",
    description: "Version, links, and how Lux handles your data",
    icon: LuxMark,
  },
};
