import { useEffect } from "react";
import { usePolledDefinition } from "@/widgets/core/usePolledResource";
import { newsTrends } from "@/widgets/news/lib/resources";
import { ranksOf } from "@/widgets/news/lib/trend-movement";
import { useNews, useNewsStore } from "@/widgets/news/useNewsStore";

export function useTrendingResource(enabled = true) {
  const region = useNews((d) => d.trendRegion);
  const snapshot = useNewsStore((s) => s.trendSnapshots[region]);
  const remember = useNewsStore((s) => s.rememberTrendSnapshot);

  const resource = usePolledDefinition(newsTrends(region), { enabled });

  const feed = resource.state.status === "success" ? resource.state.data : null;
  const syncedAt = resource.lastSyncedAt;

  useEffect(() => {
    if (!enabled || !feed || syncedAt <= 0) return;
    remember(region, ranksOf(feed.items), syncedAt);
  }, [enabled, feed, syncedAt, region, remember]);

  return { ...resource, region, feed, previousRanks: snapshot?.previous ?? {} };
}
