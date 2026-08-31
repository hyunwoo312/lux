import { Bookmark, Clock, PanelTop, TrendingUp } from "lucide-react";
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
import { getGrantedPermissions } from "@/lib/permissions";
import { isSourceEnabled, paletteOpenBehavior, type PaletteSource } from "@/stores/usePaletteStore";
import type { CommandItem } from "@/commands/items";
import type { WidgetIcon } from "@/widgets/core/types";
import { matchesQuery } from "@/widgets/core/commandResult";

const PER_SOURCE_LIMIT = 5;

const TOP_SITE_LIMIT = 3;

type LinkSource = {
  source: PaletteSource;
  permission: chrome.runtime.ManifestPermission;
  label: string;
  icon: WidgetIcon;
  limit: number;
  load: (query: string) => Promise<BrowserItem[]>;
};

const SOURCES: readonly LinkSource[] = [
  {
    source: "openTabs",
    permission: "tabs",
    label: "Open tab",
    icon: PanelTop,
    limit: PER_SOURCE_LIMIT,
    load: fetchOpenTabs,
  },
  {
    source: "bookmarks",
    permission: "bookmarks",
    label: "Bookmark",
    icon: Bookmark,
    limit: PER_SOURCE_LIMIT,
    load: (query) => searchBookmarks(query, PER_SOURCE_LIMIT),
  },
  {
    source: "history",
    permission: "history",
    label: "History",
    icon: Clock,
    limit: PER_SOURCE_LIMIT,
    load: (query) => searchHistory(query, PER_SOURCE_LIMIT),
  },
  {
    source: "topSites",
    permission: "topSites",
    label: "Top site",
    icon: TrendingUp,
    limit: TOP_SITE_LIMIT,
    load: fetchTopSites,
  },
];

export function address(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return url;
  }
}

function matches(item: BrowserItem, needle: string): boolean {
  return matchesQuery(`${item.title} ${item.url}`, needle);
}

function toItem(item: BrowserItem, source: LinkSource): CommandItem {
  const { tabId, windowId, url } = item;
  return {
    id: item.id,
    section: "links",
    label: item.title,
    detail: address(url),
    meta: source.label,
    icon: source.icon,
    artworkUrl: faviconUrl(url) ?? undefined,
    keywords: [url, address(url), source.label],
    effect: "run",
    run:
      tabId !== undefined && windowId !== undefined
        ? () => focusTab(tabId, windowId)
        : () => openUrl(url, paletteOpenBehavior()),
  };
}

export async function linkItems(query: string): Promise<CommandItem[]> {
  const needle = query.trim();
  if (needle === "") return [];

  const granted = getGrantedPermissions();
  if (granted === null) return [];

  const loaded = await Promise.all(
    SOURCES.map(async (source) => {
      if (!isSourceEnabled(source.source) || !granted.has(source.permission)) return [];
      const items = await source.load(needle).catch(() => []);
      return items.filter((item) => matches(item, needle)).slice(0, source.limit);
    }),
  );

  const seen = new Set<string>();
  const items: CommandItem[] = [];
  loaded.forEach((found, index) => {
    const source = SOURCES[index];
    if (!source) return;
    for (const item of found) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      items.push(toItem(item, source));
    }
  });
  return items;
}
