import { useCallback, useEffect } from "react";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { fetchTrends, parseCachedTrends, trendsKey } from "@/widgets/news/lib/trending";
import { ranksOf } from "@/widgets/news/lib/trend-movement";
import { useNews, useNewsStore } from "@/widgets/news/useNewsStore";

const REFRESH_MS = 10 * 60 * 1000;

export function useTrendingResource(enabled = true) {
  const region = useNews((d) => d.trendRegion);
  const snapshot = useNewsStore((s) => s.trendSnapshots[region]);
  const remember = useNewsStore((s) => s.rememberTrendSnapshot);

  const fetcher = useCallback((signal: AbortSignal) => fetchTrends(region, signal), [region]);
  const resource = usePolledResource(fetcher, {
    enabled,
    intervalMs: REFRESH_MS,
    cacheKey: trendsKey(region),
    persist: true,
    parsePersisted: parseCachedTrends,
  });

  const feed = resource.state.status === "success" ? resource.state.data : null;
  const syncedAt = resource.lastSyncedAt;

  useEffect(() => {
    if (!enabled || !feed || syncedAt <= 0) return;
    remember(region, ranksOf(feed.items), syncedAt);
  }, [enabled, feed, syncedAt, region, remember]);

  return { ...resource, region, feed, previousRanks: snapshot?.previous ?? {} };
}
