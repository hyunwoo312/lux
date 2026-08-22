import { usePolledResource } from "@/widgets/core/usePolledResource";
import {
  fetchFeed,
  fetchMergedFeeds,
  fetchSearch,
  parseCachedNews,
  readFailedSources,
  resolveNewsTab,
} from "@/widgets/news/lib/news";
import { useNews } from "@/widgets/news/useNewsStore";
import { NEWS_SOURCES } from "@/widgets/news/types";

const REFRESH_MS = 10 * 60 * 1000;

export function useNewsResource(enabled = true) {
  const activeSource = useNews((d) => d.activeSource);
  const enabledSources = useNews((d) => d.enabledSources);
  const region = useNews((d) => d.region);
  const topic = useNews((d) => d.topic);
  const googleQuery = useNews((d) => d.googleQuery);

  const sources = NEWS_SOURCES.filter((entry) => enabledSources.includes(entry));
  const tab = resolveNewsTab(activeSource, sources);
  const query = tab === "google" ? googleQuery.trim() : "";

  const cacheKey =
    tab === "all"
      ? `news:all:${region}:${topic}:${sources.join(",")}`
      : query
        ? `news:search:${region}:${query}`
        : `news:${tab}:${region}:${topic}`;

  const fetcher = (signal: AbortSignal) => {
    const run =
      tab === "all"
        ? fetchMergedFeeds(sources, region, topic, signal, cacheKey)
        : query
          ? fetchSearch(query, region, signal)
          : fetchFeed(tab, region, topic, signal);
    return run;
  };
  const { state, refresh, isRefreshing, lastSyncedAt, freshness } = usePolledResource(fetcher, {
    enabled,
    intervalMs: REFRESH_MS,
    cacheKey,
    persist: true,
    parsePersisted: parseCachedNews,
  });

  const isStale = freshness.status === "failing" && state.status === "success";
  const missingSources = tab === "all" ? readFailedSources(cacheKey) : [];

  return {
    state,
    refresh,
    isRefreshing,
    lastSyncedAt,
    freshness,
    tab,
    query,
    isStale,
    missingSources,
  };
}
