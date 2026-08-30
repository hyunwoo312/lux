import type { PolledResourceState } from "@/widgets/core/usePolledResource";
import { usePolledDefinition } from "@/widgets/core/usePolledResource";
import { hasThumbnails, orderedSources, resolveNewsTab } from "@/widgets/news/lib/news";
import { newsFeed } from "@/widgets/news/lib/resources";
import { useNews } from "@/widgets/news/useNewsStore";
import type { NewsItem } from "@/widgets/news/types";

export function useNewsResource(enabled = true) {
  const activeSource = useNews((d) => d.activeSource);
  const enabledSources = useNews((d) => d.enabledSources);
  const region = useNews((d) => d.region);
  const topic = useNews((d) => d.topic);
  const googleQuery = useNews((d) => d.googleQuery);

  const sources = orderedSources(enabledSources);
  const tab = resolveNewsTab(activeSource, sources);
  const query = tab === "google" ? googleQuery.trim() : "";

  const raw = usePolledDefinition(newsFeed({ tab, region, topic, sources, query }), {
    enabled,
    isEmpty: (payload) => payload.items.length === 0,
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
