import { usePolledResource } from "@/widgets/core/usePolledResource";
import {
  fetchFeed,
  fetchMergedFeeds,
  fetchSearch,
  parseCachedNews,
  resolveNewsTab,
} from "@/widgets/news/lib/news";
import { useNews } from "@/widgets/news/useNewsStore";
import { NEWS_SOURCES } from "@/widgets/news/types";

const REFRESH_MS = 10 * 60 * 1000;

export function useNewsResource() {
  const activeSource = useNews((d) => d.activeSource);
  const enabledSources = useNews((d) => d.enabledSources);
  const region = useNews((d) => d.region);
  const googleQuery = useNews((d) => d.googleQuery);

  const sources = NEWS_SOURCES.filter((entry) => enabledSources.includes(entry));
  const tab = resolveNewsTab(activeSource, sources);
  const query = tab === "google" ? googleQuery.trim() : "";

  const cacheKey =
    tab === "all"
      ? `news:all:${region}:${sources.join(",")}`
      : query
        ? `news:search:${region}:${query}`
        : `news:${tab}:${region}`;

  const fetcher = (signal: AbortSignal) => {
    if (tab === "all") return fetchMergedFeeds(sources, region, signal);
    if (query) return fetchSearch(query, region, signal);
    return fetchFeed(tab, region, signal);
  };
  const { state, refresh, isRefreshing, lastSyncedAt } = usePolledResource(fetcher, {
    intervalMs: REFRESH_MS,
    cacheKey,
    persist: true,
    parsePersisted: parseCachedNews,
  });

  return { state, refresh, isRefreshing, lastSyncedAt, tab, query };
}
