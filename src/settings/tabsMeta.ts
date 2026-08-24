import type { ComponentType } from "react";
import { Keyboard, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { LuxMark } from "@/components/LuxMark";

export const SETTINGS_TABS = ["general", "accounts", "shortcuts", "about"] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

type SettingsTabMeta = {
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export const SETTINGS_TAB_META: Record<SettingsTab, SettingsTabMeta> = {
  general: {
    label: "General",
    icon: SlidersHorizontal,
  },
  accounts: {
    label: "Accounts & Permissions",
    icon: ShieldCheck,
  },
  shortcuts: {
    label: "Shortcuts",
    icon: Keyboard,
  },
  about: {
    label: "About",
    icon: LuxMark,
  },
};
