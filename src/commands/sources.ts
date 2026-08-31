import { Search } from "lucide-react";
import { LuxMark } from "@/components/LuxMark";
import { ChatGptMark, ClaudeMark } from "@/components/icons/service-icons";
import { availableWidgetCommands } from "@/commands/widgetCommands";
import { accentCommand } from "@/commands/accent";
import { addWidgetCommand } from "@/commands/addWidget";
import { browserCommands } from "@/commands/browser";
import { SYSTEM_OWNER, type CommandItem } from "@/commands/items";
import type { CommandSetup } from "@/widgets/core/types";
import type { WidgetIcon } from "@/widgets/core/types";
import { openUrl, searchWeb } from "@/lib/open-url";

import { SHORTCUT_DEFINITIONS, type ShortcutAction } from "@/stores/useShortcutsStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { runShortcutAction } from "@/app/useGlobalShortcuts";
import { isCommandEnabled, isSourceEnabled, paletteOpenBehavior } from "@/stores/usePaletteStore";
import { getWidgetPlugin } from "@/widgets/registry";

const SEARCH_OWNER = "Search";

const DESTINATIONS = [
  { id: "claude", label: "Ask Claude", url: "https://claude.ai/new?q=", icon: ClaudeMark },
  { id: "chatgpt", label: "Ask ChatGPT", url: "https://chatgpt.com/?q=", icon: ChatGptMark },
] as const;

function widgetItems(): CommandItem[] {
  return availableWidgetCommands()
    .filter((command) => isCommandEnabled(command.id))
    .map((command) =>
      command.kind === "action"
        ? {
            id: command.id,
            section: "commands",
            label: command.label,
            meta: command.widget,
            icon: command.icon,
            keywords: [...(command.keywords ?? []), command.description],
            setup: command.setupNeeded,
            effect: "run",
            run: command.run,
          }
        : {
            id: command.id,
            section: "commands",
            label: command.label,
            meta: command.widget,
            icon: command.icon,
            keywords: [...(command.keywords ?? []), command.description],
            setup: command.setupNeeded,
            effect: "scope",
            placeholder: command.placeholder,
            emptyMessage: command.emptyMessage,
            search: command.search,
          },
    );
}

const ACTION_TEXT: Partial<Record<ShortcutAction, { label: string; describe: () => string }>> = {
  openSettings: { label: "Open settings", describe: () => "Open the settings dialog" },
  openGuide: { label: "Open guide", describe: () => "Open the guide dialog" },
  toggleGridLines: { label: "Toggle grid lines", describe: () => "Show or hide the grid overlay" },
  toggleTheme: {
    label: "Toggle theme",
    describe: () =>
      useThemeStore.getState().theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
  },
};

const SCOPED_ACTIONS: Partial<Record<ShortcutAction, CommandItem>> = {
  addWidget: addWidgetCommand,
};

function systemItems(): CommandItem[] {
  const shortcuts = SHORTCUT_DEFINITIONS.map<CommandItem>((definition) => {
    const scoped = SCOPED_ACTIONS[definition.id];
    if (scoped) return scoped;
    const text = ACTION_TEXT[definition.id];
    return {
      id: `action.${definition.id}`,
      section: "commands",
      label: text?.label ?? definition.label,
      meta: SYSTEM_OWNER,
      icon: definition.icon,
      keywords: [text?.describe() ?? definition.description],
      effect: "run",
      run: () => runShortcutAction(definition.id),
    };
  });
  return [...shortcuts, accentCommand, ...browserCommands()];
}

function searchItems(query: string): CommandItem[] {
  const term = query.trim();
  if (term === "") return [];

  const web: CommandItem = {
    id: "search.web",
    section: "search",
    label: `Search for “${term}”`,
    meta: SEARCH_OWNER,
    icon: Search,
    effect: "run",
    run: () => searchWeb(term, paletteOpenBehavior()),
  };

  return [
    web,
    ...DESTINATIONS.map<CommandItem>((destination) => ({
      id: `search.${destination.id}`,
      section: "search",
      label: `${destination.label} about “${term}”`,
      meta: SEARCH_OWNER,
      icon: destination.icon,
      effect: "run",
      run: () => openUrl(`${destination.url}${encodeURIComponent(term)}`, paletteOpenBehavior()),
    })),
  ];
}

export function commandItems(query: string): CommandItem[] {
  return [
    ...widgetItems(),
    ...systemItems().filter((item) => isCommandEnabled(item.id)),
    ...(isSourceEnabled("webSearch") ? searchItems(query) : []),
  ];
}

export type CatalogueCommand = { id: string; label: string; setup: CommandSetup | null };

export type CommandGroup = {
  id: string;
  label: string;
  icon: WidgetIcon;
  setup: CommandSetup | null;
  commands: CatalogueCommand[];
};

export function commandCatalogue(): CommandGroup[] {
  const system: CommandGroup = {
    id: "system",
    label: "System commands",
    icon: LuxMark,
    setup: null,
    commands: systemItems().map(({ id, label, setup }) => ({ id, label, setup: setup ?? null })),
  };

  const groups = new Map<string, CommandGroup>();
  for (const command of availableWidgetCommands()) {
    const group = groups.get(command.widgetType) ?? {
      id: command.widgetType,
      label: `${command.widget} commands`,
      icon: getWidgetPlugin(command.widgetType).icon,
      setup: null,
      commands: [],
    };
    group.commands.push({ id: command.id, label: command.label, setup: command.setupNeeded });
    group.setup ??= command.setupNeeded;
    groups.set(command.widgetType, group);
  }

  return [system, ...[...groups.values()].sort((a, b) => a.label.localeCompare(b.label))];
}
