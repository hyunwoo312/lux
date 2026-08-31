import { Bookmark, Flame, Newspaper, Search } from "lucide-react";
import { matchesQuery, openResult } from "@/widgets/core/commandResult";
import { SOURCE_ICONS } from "@/widgets/news/components/sourceIcons";
import { searchWeb } from "@/lib/open-url";
import { formatRelativeTime } from "@/lib/relative-time";
import { paletteOpenBehavior } from "@/stores/usePaletteStore";
import { instanceData } from "@/widgets/core/instances";
import { needsWidget } from "@/widgets/core/commandSetup";
import type { CommandResult, WidgetCommand } from "@/widgets/core/types";
import { readPolled } from "@/widgets/core/usePolledResource";
import { fetchSearch, orderedSources } from "@/widgets/news/lib/news";
import { newsFeed, newsTrends } from "@/widgets/news/lib/resources";
import { DEFAULT_DATA, useNewsStore, type NewsData } from "@/widgets/news/useNewsStore";
import type { NewsItem, TrendItem } from "@/widgets/news/types";

const HEADLINE_LIMIT = 40;

const TREND_LIMIT = 20;

function settings(): NewsData {
  const [first] = instanceData("news", useNewsStore.getState().byInstance, DEFAULT_DATA);
  return first?.data ?? DEFAULT_DATA;
}

function when(at: number | null): string | undefined {
  return at === null ? undefined : formatRelativeTime(new Date(at).toISOString());
}

function itemRow(item: NewsItem, section: string, savedAt?: number): CommandResult {
  return {
    id: `news.item.${item.id}`,
    label: item.title,
    detail: item.source,
    section,
    meta: when(savedAt ?? item.publishedAt),
    icon: item.sourceKey === null ? Newspaper : SOURCE_ICONS[item.sourceKey],
    artworkUrl: item.image ?? undefined,
    run: () => openResult(item.link),
  };
}

function trendRow(trend: TrendItem): CommandResult {
  return {
    id: `news.trend.${trend.term}`,
    label: trend.term,
    detail: trend.news[0]?.title,
    section: "Trending now",
    meta: trend.trafficLabel,
    icon: Flame,
    run: () => searchWeb(trend.term, paletteOpenBehavior()),
  };
}

const headlines: WidgetCommand = {
  kind: "provider",
  id: "news.headlines",
  label: "Headlines",
  description: "Today's stories from the sources you follow",
  icon: Newspaper,
  keywords: ["news", "story", "article", "read", "latest"],
  placeholder: "Search today's headlines",
  emptyMessage: (query) =>
    query === "" ? "No headlines right now." : `No headline matched “${query}”.`,
  search: async (query) => {
    const { region, topic, enabledSources } = settings();
    const needle = query.trim();
    const payload = await readPolled(
      newsFeed({ tab: "all", region, topic, sources: orderedSources(enabledSources), query: "" }),
    );
    return payload.items
      .filter((item) => matchesQuery(`${item.title} ${item.source}`, needle))
      .slice(0, HEADLINE_LIMIT)
      .map((item) => itemRow(item, "Top stories"));
  },
};

const searchNews: WidgetCommand = {
  kind: "provider",
  id: "news.search",
  label: "Search the news",
  description: "Search Google News for a story",
  icon: Search,
  keywords: ["news", "story", "article", "find", "google"],
  placeholder: "Search the news",
  emptyMessage: (query) =>
    query === "" ? "Type to search the news." : `No story matched “${query}”.`,
  search: async (query, signal) => {
    const needle = query.trim();
    if (needle === "") return [];
    const payload = await fetchSearch(needle, settings().region, signal);
    return payload.items.slice(0, HEADLINE_LIMIT).map((item) => itemRow(item, "Search results"));
  },
};

const trending: WidgetCommand = {
  kind: "provider",
  id: "news.trending",
  label: "Trending searches",
  description: "What people are searching for right now",
  icon: Flame,
  keywords: ["news", "trends", "popular", "hot", "google"],
  placeholder: "Search trends",
  emptyMessage: (query) =>
    query === "" ? "Nothing trending right now." : `No trend matched “${query}”.`,
  search: async (query) => {
    const needle = query.trim();
    const feed = await readPolled(newsTrends(settings().trendRegion));
    return feed.items
      .filter((trend) => matchesQuery(trend.term, needle))
      .slice(0, TREND_LIMIT)
      .map(trendRow);
  },
};

const bookmarks: WidgetCommand = {
  kind: "provider",
  id: "news.bookmarks",
  label: "Saved stories",
  description: "Open a story you bookmarked to read later",
  icon: Bookmark,
  keywords: ["news", "bookmark", "saved", "later", "reading"],
  placeholder: "Search saved stories",
  emptyMessage: (query) =>
    query === "" ? "Nothing saved yet." : `No saved story matched “${query}”.`,
  search: async (query) => {
    const needle = query.trim();
    const saved = instanceData("news", useNewsStore.getState().byInstance, DEFAULT_DATA).flatMap(
      ({ data }) => data.bookmarks,
    );
    const seen = new Set<string>();
    return saved
      .sort((a, b) => b.savedAt - a.savedAt)
      .filter((entry) => {
        if (seen.has(entry.item.id)) return false;
        seen.add(entry.item.id);
        return matchesQuery(`${entry.item.title} ${entry.item.source}`, needle);
      })
      .map((entry) => itemRow(entry.item, "Saved", entry.savedAt));
  },
};

export const newsCommands = (): WidgetCommand[] => [
  headlines,
  searchNews,
  trending,
  { ...bookmarks, setup: () => needsWidget("news", "News") },
];
