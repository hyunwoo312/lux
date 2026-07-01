import { useCallback, useMemo } from "react";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import {
  fetchFeed,
  feedUrl,
  parseCachedNews,
  searchUrl,
  sourceLabel,
} from "@/widgets/news/lib/news";
import { useNews } from "@/widgets/news/useNewsStore";
import { NEWS_SOURCES, type NewsSource } from "@/widgets/news/types";

const REFRESH_MS = 10 * 60 * 1000;

export function useNewsResource() {
  const activeSource = useNews((d) => d.activeSource);
  const enabledSources = useNews((d) => d.enabledSources);
  const topic = useNews((d) => d.topic);
  const googleQuery = useNews((d) => d.googleQuery);

  const sources = NEWS_SOURCES.filter((entry) => enabledSources.includes(entry));
  const source: NewsSource = sources.includes(activeSource)
    ? activeSource
    : (sources[0] ?? "google");
  const query = source === "google" ? googleQuery.trim() : "";

  const request = useMemo(
    () =>
      query
        ? { url: searchUrl(query), label: sourceLabel("google") }
        : { url: feedUrl(source, topic), label: sourceLabel(source) },
    [source, topic, query],
  );

  const fetcher = useCallback(
    (signal: AbortSignal) => fetchFeed(request.url, request.label, signal),
    [request],
  );
  const { state, refresh, isRefreshing, lastSyncedAt } = usePolledResource(fetcher, {
    intervalMs: REFRESH_MS,
    cacheKey: `news:${request.url}`,
    persist: true,
    parsePersisted: parseCachedNews,
  });

  return { state, refresh, isRefreshing, lastSyncedAt, source, query };
}
