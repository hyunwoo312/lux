import { isHttpUrl } from "@/lib/open-url";

export type BrowserItem = {
  id: string;
  title: string;
  url: string;
  sessionId?: string;
  tabId?: number;
  windowId?: number;
  audible?: boolean;
  muted?: boolean;
  visitedAt?: number;
  visitCount?: number;
};

export type BookmarkFolder = {
  id: string;
  title: string;
  folders: BookmarkFolder[];
  items: BrowserItem[];
};

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
    if (!child.url) folders.push(toBookmarkFolder(child, UNTITLED_FOLDER));
    else if (isHttpUrl(child.url))
      items.push({ id: child.id, title: child.title || child.url, url: child.url });
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
  if (!tab?.url || !isHttpUrl(tab.url)) return null;
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
  if (!item.url || !isHttpUrl(item.url)) return null;
  return {
    id: item.id,
    title: item.title || item.url,
    url: item.url,
    visitedAt: item.lastVisitTime,
    visitCount: item.visitCount,
  };
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
  return sessions.map(sessionToItem).filter((item): item is BrowserItem => item !== null);
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
    if (!item || seen.has(item.url)) continue;
    seen.add(item.url);
    items.push(item);
    if (items.length >= limit) break;
  }
  return items;
}

export async function searchBookmarks(text: string, limit: number): Promise<BrowserItem[]> {
  if (typeof chrome === "undefined" || !chrome.bookmarks?.search) return [];
  const nodes = await chrome.bookmarks.search({ query: text });
  const items: BrowserItem[] = [];
  for (const node of nodes) {
    if (node.url === undefined || !isHttpUrl(node.url)) continue;
    items.push({ id: `bookmark-${node.id}`, title: node.title || node.url, url: node.url });
    if (items.length >= limit) break;
  }
  return items;
}

export function tabToItem(tab: chrome.tabs.Tab): BrowserItem | null {
  if (tab.id === undefined || !tab.url) return null;
  return {
    id: `tab-${tab.id}`,
    title: tab.title?.trim() || tab.url,
    url: tab.url,
    tabId: tab.id,
    windowId: tab.windowId,
    audible: tab.audible === true,
    muted: tab.mutedInfo?.muted === true,
  };
}

export async function fetchOpenTabs(): Promise<BrowserItem[]> {
  if (typeof chrome === "undefined" || !chrome.tabs?.query) return [];
  const [tabs, current] = await Promise.all([
    chrome.tabs.query({}),
    chrome.tabs.getCurrent().catch(() => undefined),
  ]);
  return tabs
    .filter((tab) => tab.id !== current?.id)
    .map(tabToItem)
    .filter((item): item is BrowserItem => item !== null);
}

export async function focusTab(tabId: number, windowId: number): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.tabs?.update) return;
  await chrome.tabs.update(tabId, { active: true }).catch(() => undefined);
  await chrome.windows?.update(windowId, { focused: true }).catch(() => undefined);
}

export async function closeTab(tabId: number): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.tabs?.remove) return;
  await chrome.tabs.remove(tabId).catch(() => undefined);
}

export async function setTabMuted(tabId: number, muted: boolean): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.tabs?.update) return;
  await chrome.tabs.update(tabId, { muted }).catch(() => undefined);
}

export function watchTabs(onChange: () => void): () => void {
  const events = [
    chrome?.tabs?.onCreated,
    chrome?.tabs?.onRemoved,
    chrome?.tabs?.onUpdated,
    chrome?.tabs?.onMoved,
  ].filter(Boolean) as {
    addListener: (fn: () => void) => void;
    removeListener: (fn: () => void) => void;
  }[];
  for (const event of events) event.addListener(onChange);
  return () => {
    for (const event of events) event.removeListener(onChange);
  };
}

export async function fetchTopSites(): Promise<BrowserItem[]> {
  if (typeof chrome === "undefined" || !chrome.topSites?.get) return [];
  const sites = await chrome.topSites.get();
  return sites
    .filter((site) => isHttpUrl(site.url))
    .map((site) => ({ id: `top-${site.url}`, title: site.title || site.url, url: site.url }));
}
