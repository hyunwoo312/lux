import type { BrowserItem } from "@/widgets/quick-access/types";

const RECENTLY_CLOSED_REQUEST = 25;
const RECENTLY_CLOSED_LIMIT = 10;
const HISTORY_LIMIT = 25;
const HISTORY_SUGGESTION_LIMIT = 7;
const BOOKMARK_LIMIT = 50;
const TOP_SITES_LIMIT = 12;

export function flattenBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[]): BrowserItem[] {
  const items: BrowserItem[] = [];
  const walk = (list: chrome.bookmarks.BookmarkTreeNode[]) => {
    for (const node of list) {
      if (node.url) items.push({ id: node.id, title: node.title || node.url, url: node.url });
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return items;
}

export function sessionToItem(session: chrome.sessions.Session): BrowserItem | null {
  const tab = session.tab ?? session.window?.tabs?.find((entry) => Boolean(entry.url));
  if (!tab?.url) return null;
  return { id: `closed-${tab.sessionId ?? tab.url}`, title: tab.title || tab.url, url: tab.url };
}

export function historyToItem(item: chrome.history.HistoryItem): BrowserItem | null {
  if (!item.url) return null;
  return { id: item.id, title: item.title || item.url, url: item.url };
}

export async function fetchBookmarks(): Promise<BrowserItem[]> {
  if (typeof chrome === "undefined" || !chrome.bookmarks?.getTree) return [];
  const tree = await chrome.bookmarks.getTree();
  return flattenBookmarks(tree).slice(0, BOOKMARK_LIMIT);
}

export async function fetchHistory(): Promise<BrowserItem[]> {
  if (typeof chrome === "undefined" || !chrome.history?.search) return [];
  const items = await chrome.history.search({ text: "", maxResults: HISTORY_LIMIT });
  return items.map(historyToItem).filter((item): item is BrowserItem => item !== null);
}

export async function fetchRecentlyClosed(): Promise<BrowserItem[]> {
  if (typeof chrome === "undefined" || !chrome.sessions?.getRecentlyClosed) return [];
  const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: RECENTLY_CLOSED_REQUEST });
  return sessions
    .map(sessionToItem)
    .filter((item): item is BrowserItem => item !== null && /^https?:\/\//.test(item.url))
    .slice(0, RECENTLY_CLOSED_LIMIT);
}

export async function searchHistory(
  text: string,
  limit = HISTORY_SUGGESTION_LIMIT,
): Promise<BrowserItem[]> {
  if (typeof chrome === "undefined" || !chrome.history?.search) return [];
  const raw = await chrome.history.search({ text, maxResults: limit * 6, startTime: 0 });
  const seen = new Set<string>();
  const items: BrowserItem[] = [];
  for (const entry of raw) {
    const item = historyToItem(entry);
    if (!item || !/^https?:\/\//.test(item.url) || seen.has(item.url)) continue;
    seen.add(item.url);
    items.push(item);
    if (items.length >= limit) break;
  }
  return items;
}

export async function fetchTopSites(): Promise<BrowserItem[]> {
  if (typeof chrome === "undefined" || !chrome.topSites?.get) return [];
  const sites = await chrome.topSites.get();
  return sites
    .filter((site) => /^https?:\/\//.test(site.url))
    .map((site) => ({ id: `top-${site.url}`, title: site.title || site.url, url: site.url }))
    .slice(0, TOP_SITES_LIMIT);
}
