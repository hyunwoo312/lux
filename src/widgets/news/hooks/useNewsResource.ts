import type { PolledResourceState } from "@/widgets/core/usePolledResource";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import {
  fetchFeed,
  fetchMergedFeeds,
  fetchSearch,
  hasThumbnails,
  orderedSources,
  parseCachedNews,
  resolveNewsTab,
} from "@/widgets/news/lib/news";
import { useNews } from "@/widgets/news/useNewsStore";
import { NEWS_REFRESH_MS, type NewsItem } from "@/widgets/news/types";

export function useNewsResource(enabled = true) {
  const activeSource = useNews((d) => d.activeSource);
  const enabledSources = useNews((d) => d.enabledSources);
  const region = useNews((d) => d.region);
  const topic = useNews((d) => d.topic);
  const googleQuery = useNews((d) => d.googleQuery);

  const sources = orderedSources(enabledSources);
  const tab = resolveNewsTab(activeSource, sources);
  const query = tab === "google" ? googleQuery.trim() : "";

  const cacheKey =
    tab === "all"
      ? `news:all:${region}:${topic}:${sources.join(",")}`
      : query
        ? `news:search:${region}:${query}`
        : `news:${tab}:${region}:${topic}`;

  const fetcher = (signal: AbortSignal) =>
    tab === "all"
      ? fetchMergedFeeds(sources, region, topic, signal)
      : query
        ? fetchSearch(query, region, signal)
        : fetchFeed(tab, region, topic, signal);

  const raw = usePolledResource(fetcher, {
    enabled,
    intervalMs: NEWS_REFRESH_MS,
    isEmpty: (payload) => payload.items.length === 0,
    cacheKey,
    persist: true,
    parsePersisted: parseCachedNews,
  });

  const state: PolledResourceState<NewsItem[]> =
    raw.state.status === "success" ? { status: "success", data: raw.state.data.items } : raw.state;

  return {
    state,
    refresh: raw.refresh,
    isRefreshing: raw.isRefreshing,
    lastSyncedAt: raw.lastSyncedAt,
    freshness: raw.freshness,
    tab,
    query,
    missingSources: raw.state.status === "success" ? raw.state.data.missing : [],
    withThumbnail: tab === "all" ? enabledSources.some(hasThumbnails) : hasThumbnails(tab),
  };
}
