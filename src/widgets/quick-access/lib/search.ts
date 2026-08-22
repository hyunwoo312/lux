import type { BookmarkFolder, BrowserItem } from "@/widgets/quick-access/types";

function matches(item: BrowserItem, query: string): boolean {
  return item.title.toLowerCase().includes(query) || item.url.toLowerCase().includes(query);
}

export function filterItems(items: BrowserItem[], query: string): BrowserItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return items;
  return items.filter((item) => matches(item, trimmed));
}

export function searchBookmarks(folder: BookmarkFolder, query: string, limit = 200): BrowserItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  const found: BrowserItem[] = [];
  const seen = new Set<string>();

  const walk = (node: BookmarkFolder) => {
    for (const item of node.items) {
      if (found.length >= limit) return;
      if (matches(item, trimmed) && !seen.has(item.id)) {
        seen.add(item.id);
        found.push(item);
      }
    }
    for (const child of node.folders) {
      if (found.length >= limit) return;
      walk(child);
    }
  };

  walk(folder);
  return found;
}
