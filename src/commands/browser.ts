import {
  fetchOpenTabs,
  fetchTopSites,
  focusTab,
  searchBookmarks,
  searchHistory,
  type BrowserItem,
} from "@/lib/browser";
import { faviconUrl } from "@/lib/favicon";
import { openUrl } from "@/lib/open-url";
import { getGrantedPermissions, setPermissionsGranted } from "@/lib/permissions";
import { formatRelativeTime } from "@/lib/relative-time";
import {
  isSourceEnabled,
  PALETTE_SOURCE_META,
  paletteOpenBehavior,
  type PaletteSource,
} from "@/stores/usePaletteStore";
import { SYSTEM_OWNER, type CommandItem } from "@/commands/items";
import { address } from "@/commands/links";
import type { CommandResult } from "@/widgets/core/types";
import { matchesQuery } from "@/lib/utils";

const RESULT_LIMIT = 30;

function allowed(source: PaletteSource): boolean {
  const { permission } = PALETTE_SOURCE_META[source];
  return permission === undefined || (getGrantedPermissions()?.has(permission) ?? false);
}

type BrowserScope = {
  source: PaletteSource;
  id: string;
  label: string;
  description: string;
  keywords: readonly string[];
  placeholder: string;
  section: string;
  subject: string;
  load: (query: string) => Promise<BrowserItem[]>;
  meta?: (item: BrowserItem) => string | undefined;
};

const SCOPES: readonly BrowserScope[] = [
  {
    source: "bookmarks",
    id: "browser.bookmarks",
    label: "Search bookmarks",
    description: "Find a page you have saved",
    keywords: ["bookmark", "saved", "favourite", "favorite"],
    placeholder: "Search bookmarks",
    section: "Bookmarks",
    subject: "your bookmarks",
    load: (query) => searchBookmarks(query, RESULT_LIMIT),
  },
  {
    source: "history",
    id: "browser.history",
    label: "Browse history",
    description: "Find a page you visited before",
    keywords: ["history", "visited", "recent", "again"],
    placeholder: "Search history",
    section: "History",
    subject: "your browsing history",
    load: (query) => searchHistory(query, RESULT_LIMIT),
    meta: (item) =>
      item.visitedAt === undefined
        ? undefined
        : formatRelativeTime(new Date(item.visitedAt).toISOString()),
  },
  {
    source: "openTabs",
    id: "browser.tabs",
    label: "Switch tab",
    description: "Jump to a tab you already have open",
    keywords: ["tab", "switch", "window", "open"],
    placeholder: "Search open tabs",
    section: "Open tabs",
    subject: "your open tabs",
    load: fetchOpenTabs,
    meta: (item) => (item.audible === true && item.muted !== true ? "Playing" : undefined),
  },
  {
    source: "topSites",
    id: "browser.topSites",
    label: "Top sites",
    description: "Open one of the sites you visit most",
    keywords: ["top", "frequent", "most visited", "popular"],
    placeholder: "Search top sites",
    section: "Most visited",
    subject: "the sites you visit most",
    load: fetchTopSites,
  },
];

function itemRow(item: BrowserItem, scope: BrowserScope): CommandResult {
  const { tabId, windowId, url } = item;
  return {
    id: `${scope.id}.${item.id}`,
    label: item.title,
    detail: address(url),
    meta: scope.meta?.(item),
    section: scope.section,
    icon: PALETTE_SOURCE_META[scope.source].icon,
    artworkUrl: faviconUrl(url) ?? undefined,
    run:
      tabId !== undefined && windowId !== undefined
        ? () => focusTab(tabId, windowId)
        : () => openUrl(url, paletteOpenBehavior()),
  };
}

function toCommand(scope: BrowserScope): CommandItem {
  return {
    id: scope.id,
    section: "commands",
    label: scope.label,
    meta: SYSTEM_OWNER,
    icon: PALETTE_SOURCE_META[scope.source].icon,
    keywords: [...scope.keywords, scope.description],
    setup: allowed(scope.source)
      ? null
      : {
          reason: "Allow access",
          run: () => {
            const { permission } = PALETTE_SOURCE_META[scope.source];
            if (permission) void setPermissionsGranted([permission], true);
          },
        },
    effect: "scope",
    placeholder: scope.placeholder,
    emptyMessage: (query) =>
      query === "" ? `Type to search ${scope.subject}.` : `Nothing matched “${query}”.`,
    search: async (query) => {
      const needle = query.trim();
      const items = await scope.load(needle);
      return items
        .filter((item) => matchesQuery(`${item.title} ${item.url}`, needle))
        .slice(0, RESULT_LIMIT)
        .map((item) => itemRow(item, scope));
    },
  };
}

export function browserCommands(): CommandItem[] {
  return SCOPES.filter((scope) => isSourceEnabled(scope.source)).map(toCommand);
}
