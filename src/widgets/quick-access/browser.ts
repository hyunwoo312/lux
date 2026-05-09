import type { BrowserItem, OpenBehavior } from "@/widgets/quick-access/types";

const RECENTLY_CLOSED_REQUEST = 25;
const RECENTLY_CLOSED_LIMIT = 10;
const HISTORY_LIMIT = 25;
const BOOKMARK_LIMIT = 50;

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

export function openUrl(url: string, behavior: OpenBehavior): void {
  if (behavior === "newTab") {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = url;
  }
}
