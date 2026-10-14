import { PROVIDERS } from "@/settings/providers";
import { PERMISSIONS } from "@/settings/permissions";
import {
  ACCOUNTS,
  PALETTE_COMMANDS,
  PALETTE_SOURCES_SECTION,
  PERMISSION_LIST,
  SETTINGS_SECTIONS,
  SHORTCUTS,
  REFRESH,
  WALLPAPER,
  PALETTE_SUGGESTIONS,
  DASHBOARD,
} from "@/settings/rows";
import type { SettingsTab } from "@/stores/settingsTabs";
import { SHORTCUT_DEFINITIONS } from "@/stores/shortcutDefinitions";
import { PALETTE_SOURCES, PALETTE_SOURCE_META } from "@/stores/usePaletteStore";
import { commandCatalogue } from "@/commands";
import { widgetPlugins } from "@/widgets/registry";
import { matchesQuery } from "@/lib/utils";

export type SettingEntry = {
  settingId: string;
  fallbackIds?: string[];
  hint?: string;
  label: string;
  section: string;
  tab: SettingsTab;
  description: string;
};

function destinationFallback(
  settingId: string,
  sectionId: string,
): Pick<SettingEntry, "fallbackIds" | "hint"> {
  const wallpaper = WALLPAPER.rows;
  const fallback = (...ids: string[]) => [...ids, sectionId];
  if (settingId === PALETTE_SUGGESTIONS.rows.count.settingId)
    return {
      fallbackIds: fallback(PALETTE_SUGGESTIONS.rows.suggested.settingId),
      hint: "Enable Suggested commands to adjust the count.",
    };
  if (settingId === DASHBOARD.rows.clockDate.settingId)
    return {
      fallbackIds: fallback(DASHBOARD.rows.clock.settingId),
      hint: "Show the clock to adjust its date.",
    };
  if (!settingId.startsWith(`${WALLPAPER.settingId}.`)) return { fallbackIds: [sectionId] };
  const type = wallpaper.type.settingId;
  const style = wallpaper.style.settingId;
  const mode = wallpaper.mode.settingId;
  if ([wallpaper.style, wallpaper.intensity].some((row) => row.settingId === settingId))
    return { fallbackIds: fallback(type), hint: "Choose Patterns to adjust this setting." };
  if (settingId === wallpaper.motion.settingId)
    return {
      fallbackIds: fallback(style, type),
      hint: "Choose a moving pattern to adjust motion.",
    };
  if (settingId === wallpaper.speed.settingId)
    return {
      fallbackIds: fallback(style, type),
      hint: "Choose the Aurora pattern to adjust its speed.",
    };
  if (settingId === wallpaper.shapes.settingId)
    return {
      fallbackIds: fallback(style, type),
      hint: "Choose the Mesh pattern to adjust its shapes.",
    };
  if (settingId === wallpaper.gallery.settingId)
    return { fallbackIds: fallback(type), hint: "Choose Gallery to browse wallpapers." };
  if (settingId === wallpaper.image.settingId)
    return { fallbackIds: fallback(type), hint: "Choose Custom to upload images." };
  if (settingId === wallpaper.interval.settingId)
    return {
      fallbackIds: fallback(wallpaper.timer.settingId, mode, type),
      hint: "Choose Multi and enable Change on a timer to set the interval.",
    };
  if (
    [wallpaper.newTab, wallpaper.timer, wallpaper.order].some((row) => row.settingId === settingId)
  )
    return {
      fallbackIds: fallback(mode, type),
      hint: "Choose Gallery or Custom, then Multi, to adjust rotation.",
    };
  if ([wallpaper.mode, wallpaper.fit].some((row) => row.settingId === settingId))
    return {
      fallbackIds: fallback(type),
      hint: "Choose Gallery or Custom to adjust image options.",
    };
  return { fallbackIds: [sectionId] };
}

let cached: SettingEntry[] | null = null;

export function settingsIndex(): SettingEntry[] {
  if (cached) return cached;

  cached = [
    ...SETTINGS_SECTIONS.flatMap(({ tab, title, description, rows, settingId }) => [
      {
        label: title,
        section: title,
        tab,
        description: description ?? "Settings in this section.",
        settingId,
      },
      ...Object.values(rows).map((row) => ({
        label: row.title,
        section: title,
        tab,
        description: row.description,
        settingId: row.settingId,
        ...destinationFallback(row.settingId, settingId),
      })),
    ]),
    ...widgetPlugins
      .filter((plugin) => plugin.refreshMs !== undefined)
      .map((plugin) => ({
        label: `${plugin.name} refresh`,
        section: REFRESH.title,
        tab: REFRESH.tab,
        description: `How often ${plugin.name} fetches fresh data. ${plugin.description}`,
        settingId: `${REFRESH.settingId}.${plugin.type}`,
      })),
    ...PROVIDERS.map((provider) => ({
      settingId: `${ACCOUNTS.settingId}.${provider.id}`,
      label: provider.label,
      section: ACCOUNTS.title,
      tab: ACCOUNTS.tab,
      description: provider.description,
    })),
    ...PERMISSIONS.map((permission) => ({
      settingId: `${PERMISSION_LIST.settingId}.${permission.id}`,
      label: permission.name,
      section: PERMISSION_LIST.title,
      tab: PERMISSION_LIST.tab,
      description: `${permission.description} Used by ${permission.usedBy}.`,
    })),
    ...SHORTCUT_DEFINITIONS.map((definition) => ({
      settingId: `${SHORTCUTS.settingId}.${definition.id}`,
      fallbackIds: [SHORTCUTS.settingId],
      label: definition.label,
      section: SHORTCUTS.title,
      tab: SHORTCUTS.tab,
      description: definition.description,
    })),
    ...PALETTE_SOURCES.map((source) => ({
      settingId: `${PALETTE_SOURCES_SECTION.settingId}.${source}`,
      label: PALETTE_SOURCE_META[source].label,
      section: PALETTE_SOURCES_SECTION.title,
      tab: PALETTE_SOURCES_SECTION.tab,
      description: PALETTE_SOURCE_META[source].description,
    })),
    ...commandCatalogue().map((group) => ({
      settingId: `${PALETTE_COMMANDS.settingId}.${group.id}`,
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
    .sort((a, b) => {
      const rank = (entry: SettingEntry) => {
        const label = entry.label.toLowerCase();
        return label === needle ? 0 : label.startsWith(needle) ? 1 : label.includes(needle) ? 2 : 3;
      };
      return rank(a) - rank(b);
    })
    .slice(0, 8);
}
