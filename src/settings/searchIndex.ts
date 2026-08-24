import { GENERATED_SETTINGS } from "@/settings/searchIndex.generated";
import { PROVIDERS } from "@/settings/providers";
import { PERMISSIONS } from "@/settings/permissions";
import type { SettingsTab } from "@/settings/tabsMeta";
import { SHORTCUT_DEFINITIONS } from "@/stores/shortcutDefinitions";
import { widgetPlugins } from "@/widgets/registry";

type SettingEntry = {
  label: string;
  section: string;
  tab: SettingsTab;
  description: string;
};

let cached: SettingEntry[] | null = null;

export function settingsIndex(): SettingEntry[] {
  if (cached) return cached;

  cached = [
    ...GENERATED_SETTINGS,
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
