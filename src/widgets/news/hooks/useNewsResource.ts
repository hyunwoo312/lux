import { useSyncExternalStore } from "react";
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

const failedKeys = new Map<string, boolean>();
const failureListeners = new Set<() => void>();

function setKeyFailed(cacheKey: string, failed: boolean): void {
  if ((failedKeys.get(cacheKey) ?? false) === failed) return;
  failedKeys.set(cacheKey, failed);
  for (const listener of failureListeners) listener();
}

function subscribeFailure(onChange: () => void): () => void {
  failureListeners.add(onChange);
  return () => failureListeners.delete(onChange);
}

export function useNewsResource() {
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
        ? fetchMergedFeeds(sources, region, topic, signal)
        : query
          ? fetchSearch(query, region, signal)
          : fetchFeed(tab, region, topic, signal);
    return run.then(
      (data) => {
        setKeyFailed(cacheKey, false);
        return data;
      },
      (error: unknown) => {
        setKeyFailed(cacheKey, true);
        throw error;
      },
    );
  };
  const { state, refresh, isRefreshing, lastSyncedAt } = usePolledResource(fetcher, {
    intervalMs: REFRESH_MS,
    cacheKey,
    persist: true,
    parsePersisted: parseCachedNews,
  });

  const refreshFailed = useSyncExternalStore(
    subscribeFailure,
    () => failedKeys.get(cacheKey) ?? false,
  );
  const isStale = refreshFailed && state.status === "success";

  return { state, refresh, isRefreshing, lastSyncedAt, tab, query, isStale };
}
