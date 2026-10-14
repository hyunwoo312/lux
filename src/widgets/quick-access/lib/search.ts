import type { BookmarkFolder, BrowserItem } from "@/widgets/quick-access/types";
import { matchesQuery } from "@/lib/utils";

function matches(item: BrowserItem, query: string): boolean {
  return matchesQuery(item.title, query) || matchesQuery(item.url, query);
}

export function searchBookmarks(folder: BookmarkFolder, query: string, limit = 200): BrowserItem[] {
  return searchBookmarksWithContext(folder, query, limit).map((entry) => entry.item);
}

export type BookmarkMatch = { item: BrowserItem; context: string };

export function searchBookmarksWithContext(
  folder: BookmarkFolder,
  query: string,
  limit = 200,
): BookmarkMatch[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  const found: BookmarkMatch[] = [];
  const seen = new Set<string>();

  const walk = (node: BookmarkFolder, trail: string[]) => {
    for (const item of node.items) {
      if (found.length >= limit) return;
      if (matches(item, trimmed) && !seen.has(item.id)) {
        seen.add(item.id);
        found.push({ item, context: trail.join(" / ") || "Bookmarks" });
      }
    }
    for (const child of node.folders) {
      if (found.length >= limit) return;
      walk(child, [...trail, child.title]);
    }
  };

  walk(folder, []);
  return found;
}
