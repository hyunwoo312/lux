import {
  COMMAND_SECTION_LABELS,
  SYSTEM_OWNER,
  commandItems,
  linkItems,
  matchItems,
  type CommandItem,
  type CommandSection,
} from "@/commands";
import { searchResults, useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { frecencyBoost, usePaletteStore } from "@/stores/usePaletteStore";
import type { PaletteMode } from "@/palette/useCommandPaletteStore";
import type { CommandResult, WidgetIcon } from "@/widgets/core/types";

export type PaletteEntry =
  | { kind: "item"; item: CommandItem }
  | { kind: "result"; result: CommandResult; icon: WidgetIcon };

export type PaletteGroup = { id: string; label: string; entries: PaletteEntry[] };

type PaletteEntries = {
  groups: PaletteGroup[];
  entries: PaletteEntry[];
  working: boolean;
  emptyMessage: string | null;
};

const NO_SEARCH = async (): Promise<CommandResult[]> => [];

const EMPTY_GROUPS: PaletteGroup[] = [];

const NOTHING_FOUND = "No results found.";

const LINK_MIN_QUERY = 2;

const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label);

const SYSTEM_FIRST = "";

const bySet = (a: CommandItem, b: CommandItem) =>
  (a.meta === SYSTEM_OWNER ? SYSTEM_FIRST : (a.meta ?? "")).localeCompare(
    b.meta === SYSTEM_OWNER ? SYSTEM_FIRST : (b.meta ?? ""),
  ) || byLabel(a, b);

const asEntries = (items: readonly CommandItem[]): PaletteEntry[] =>
  items.map((item) => ({ kind: "item", item }));

export function usePaletteEntries(mode: PaletteMode, query: string, open = true): PaletteEntries {
  const scope = useDebouncedSearch(
    open && mode.kind === "scope" ? query : "",
    mode.kind === "scope" ? mode.command.search : NO_SEARCH,
    { minLength: 0 },
  );
  const links = useDebouncedSearch(open && mode.kind === "root" ? query : "", linkItems, {
    minLength: LINK_MIN_QUERY,
  });

  const groups = !open
    ? EMPTY_GROUPS
    : mode.kind === "root"
      ? rootGroups(query, [...commandItems(query), ...searchResults(links)])
      : scopeGroups(searchResults(scope), mode.command.icon);

  const entries = groups.flatMap((group) => group.entries);

  return {
    groups,
    entries,
    working: mode.kind === "scope" && scope.status === "loading",
    emptyMessage: entries.length > 0 ? null : emptyMessageFor(mode, scope.status, query.trim()),
  };
}

function rootGroups(query: string, items: CommandItem[]): PaletteGroup[] {
  if (query.trim() !== "") {
    return [{ id: "results", label: "Results", entries: asEntries(matchItems(items, query)) }];
  }

  const { suggestionsEnabled, suggestionCount } = usePaletteStore.getState();
  const now = Date.now();
  const suggested = !suggestionsEnabled
    ? []
    : items
        .map((item) => ({ item, score: frecencyBoost(item.id, now) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, suggestionCount)
        .map((entry) => entry.item);

  const bySection = new Map<CommandSection, CommandItem[]>();
  for (const item of items) {
    const list = bySection.get(item.section);
    if (list) list.push(item);
    else bySection.set(item.section, [item]);
  }

  const rest = [...bySection.entries()]
    .map(([section, list]) => ({
      id: section,
      label: COMMAND_SECTION_LABELS[section],
      entries: asEntries([...list].sort(section === "commands" ? bySet : byLabel)),
    }))
    .sort(byLabel);

  if (suggested.length === 0) return rest;
  return [{ id: "suggestions", label: "Suggestions", entries: asEntries(suggested) }, ...rest];
}

function scopeGroups(results: readonly CommandResult[], icon: WidgetIcon): PaletteGroup[] {
  const groups: PaletteGroup[] = [];
  for (const result of results) {
    const label = result.section ?? "Results";
    const group = groups.find((entry) => entry.label === label);
    const value: PaletteEntry = { kind: "result", result, icon: result.icon ?? icon };
    if (group) group.entries.push(value);
    else groups.push({ id: label, label, entries: [value] });
  }
  return groups;
}

function emptyMessageFor(mode: PaletteMode, status: string, query: string): string | null {
  if (mode.kind === "root") return NOTHING_FOUND;
  if (status === "error") return "That search failed. Try again.";
  if (status === "empty") return mode.command.emptyMessage?.(query) ?? NOTHING_FOUND;
  return null;
}
