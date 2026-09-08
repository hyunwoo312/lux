import { PROVIDERS } from "@/settings/providers";
import { PERMISSIONS } from "@/settings/permissions";
import {
  ACCOUNTS,
  PALETTE_COMMANDS,
  PALETTE_SOURCES_SECTION,
  PERMISSION_LIST,
  SETTINGS_SECTIONS,
  SHORTCUTS,
} from "@/settings/rows";
import type { SettingsTab } from "@/stores/settingsTabs";
import { SHORTCUT_DEFINITIONS } from "@/stores/shortcutDefinitions";
import { PALETTE_SOURCES, PALETTE_SOURCE_META } from "@/stores/usePaletteStore";
import { commandCatalogue } from "@/commands";
import { widgetPlugins } from "@/widgets/registry";
import { matchesQuery } from "@/lib/utils";

export type SettingEntry = {
  label: string;
  section: string;
  tab: SettingsTab;
  description: string;
};

let cached: SettingEntry[] | null = null;

export function settingsIndex(): SettingEntry[] {
  if (cached) return cached;

  cached = [
    ...SETTINGS_SECTIONS.flatMap(({ tab, title, description, rows }) => [
      ...(description === undefined ? [] : [{ label: title, section: title, tab, description }]),
      ...Object.values(rows).map((row) => ({
        label: row.title,
        section: title,
        tab,
        description: row.description,
      })),
    ]),
    ...widgetPlugins.map((plugin) => ({
      label: plugin.name,
      section: "Widgets",
      tab: "widgets" as const,
      description: plugin.description,
    })),
    ...PROVIDERS.map((provider) => ({
      label: provider.label,
      section: ACCOUNTS.title,
      tab: ACCOUNTS.tab,
      description: provider.description,
    })),
    ...PERMISSIONS.map((permission) => ({
      label: permission.name,
      section: PERMISSION_LIST.title,
      tab: PERMISSION_LIST.tab,
      description: `${permission.description} Used by ${permission.usedBy}.`,
    })),
    ...SHORTCUT_DEFINITIONS.map((definition) => ({
      label: definition.label,
      section: SHORTCUTS.title,
      tab: SHORTCUTS.tab,
      description: definition.description,
    })),
    ...PALETTE_SOURCES.map((source) => ({
      label: PALETTE_SOURCE_META[source].label,
      section: PALETTE_SOURCES_SECTION.title,
      tab: PALETTE_SOURCES_SECTION.tab,
      description: PALETTE_SOURCE_META[source].description,
    })),
    ...commandCatalogue().map((group) => ({
      label: group.label,
      section: PALETTE_COMMANDS.title,
      tab: PALETTE_COMMANDS.tab,
      description: "Choose which of these commands the palette offers.",
    })),
  ];

  return cached;
}

export function searchSettings(query: string): SettingEntry[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];

  return settingsIndex()
    .filter((entry) => matchesQuery(`${entry.label} ${entry.section} ${entry.description}`, needle))
    .slice(0, 8);
}
