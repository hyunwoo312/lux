import type { BookmarkFolder, BrowserItem } from "@/widgets/quick-access/types";

const RECENTLY_CLOSED_REQUEST = 25;
const HISTORY_LIMIT = 300;
const HISTORY_SUGGESTION_LIMIT = 7;

const ROOT_TITLE = "Bookmarks";
const UNTITLED_FOLDER = "Folder";

const EMPTY_TREE: BookmarkFolder = { id: "0", title: ROOT_TITLE, folders: [], items: [] };

export function toBookmarkFolder(
  node: chrome.bookmarks.BookmarkTreeNode,
  fallbackTitle: string,
): BookmarkFolder {
  const folders: BookmarkFolder[] = [];
  const items: BrowserItem[] = [];
  for (const child of node.children ?? []) {
    if (child.url) items.push({ id: child.id, title: child.title || child.url, url: child.url });
    else folders.push(toBookmarkFolder(child, UNTITLED_FOLDER));
  }
  return { id: node.id, title: node.title || fallbackTitle, folders, items };
}

export function resolveFolderTrail(root: BookmarkFolder, path: string[]): BookmarkFolder[] {
  const trail = [root];
  let current = root;
  for (const id of path) {
    const next = current.folders.find((folder) => folder.id === id);
    if (!next) break;
    trail.push(next);
    current = next;
  }
  return trail;
}

export function sessionToItem(session: chrome.sessions.Session): BrowserItem | null {
  const tab = session.tab ?? session.window?.tabs?.find((entry) => Boolean(entry.url));
  if (!tab?.url) return null;
  return {
    id: `closed-${tab.sessionId ?? tab.url}`,
    title: tab.title || tab.url,
    url: tab.url,
    sessionId: tab.sessionId,
  };
}

export async function restoreSession(sessionId: string): Promise<boolean> {
  if (typeof chrome === "undefined" || !chrome.sessions?.restore) return false;
  try {
    await chrome.sessions.restore(sessionId);
    return true;
  } catch {
    return false;
  }
}

export function historyToItem(item: chrome.history.HistoryItem): BrowserItem | null {
  if (!item.url) return null;
  return { id: item.id, title: item.title || item.url, url: item.url };
}

export async function fetchBookmarkTree(): Promise<BookmarkFolder> {
  if (typeof chrome === "undefined" || !chrome.bookmarks?.getTree) return EMPTY_TREE;
  const [root] = await chrome.bookmarks.getTree();
  return root ? toBookmarkFolder(root, ROOT_TITLE) : EMPTY_TREE;
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
    .filter((item): item is BrowserItem => item !== null && /^https?:\/\//.test(item.url));
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
    .map((site) => ({ id: `top-${site.url}`, title: site.title || site.url, url: site.url }));
}
