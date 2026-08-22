import { normalizeTitle } from "@/widgets/news/lib/news";
import type { NewsItem } from "@/widgets/news/types";

export type HeadlineEntry = { item: NewsItem; titleKey: string };

export type HeadlineSelection =
  | { status: "muted" }
  | { status: "unmatched" }
  | { status: "ready"; entries: HeadlineEntry[]; newCount: number; highlightCount: number };

export type SelectOptions = {
  mutedTerms: string[];
  highlightTerms: string[];
  filterQuery: string;
  sortByLatest: boolean;
  readTitles: Set<string>;
  newTitles: Set<string>;
};

export function selectHeadlines(items: NewsItem[], options: SelectOptions): HeadlineSelection {
  const muted = options.mutedTerms.map((term) => term.toLowerCase());
  const visible =
    muted.length > 0
      ? items.filter((entry) => !muted.some((term) => entry.title.toLowerCase().includes(term)))
      : items;
  if (visible.length === 0) return { status: "muted" };

  const filter = options.filterQuery.toLowerCase();
  const matched = filter
    ? visible.filter(
        (entry) =>
          entry.title.toLowerCase().includes(filter) || entry.source.toLowerCase().includes(filter),
      )
    : visible;
  if (matched.length === 0) return { status: "unmatched" };

  const sorted = options.sortByLatest
    ? [...matched].sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
    : matched;

  const highlights = options.highlightTerms.map((term) => term.toLowerCase());
  const isHighlighted = (item: NewsItem) =>
    highlights.length > 0 && highlights.some((term) => item.title.toLowerCase().includes(term));
  const floated = highlights.length
    ? [...sorted.filter(isHighlighted), ...sorted.filter((item) => !isHighlighted(item))]
    : sorted;
  const highlightCount = highlights.length ? sorted.filter(isHighlighted).length : 0;

  const entries = floated.map((item) => ({ item, titleKey: normalizeTitle(item.title) }));
  const newCount = entries.reduce(
    (count, entry) =>
      count +
      (options.newTitles.has(entry.titleKey) && !options.readTitles.has(entry.titleKey) ? 1 : 0),
    0,
  );

  return { status: "ready", entries, newCount, highlightCount };
}
