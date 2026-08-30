import type { PolledDefinition } from "@/widgets/core/usePolledResource";
import {
  fetchFeed,
  fetchMergedFeeds,
  fetchSearch,
  parseCachedNews,
  type NewsPayload,
} from "@/widgets/news/lib/news";
import { fetchTrends, parseCachedTrends, trendsKey } from "@/widgets/news/lib/trending";
import type { TrendRegion } from "@/widgets/news/lib/trend-regions";
import {
  NEWS_REFRESH_MS,
  type NewsRegion,
  type NewsSource,
  type NewsTab,
  type NewsTopic,
  type TrendsFeed,
} from "@/widgets/news/types";

export type FeedRequest = {
  tab: NewsTab;
  region: NewsRegion;
  topic: NewsTopic;
  sources: NewsSource[];
  query: string;
};

function feedKey({ tab, region, topic, sources, query }: FeedRequest): string {
  if (tab === "all") return `news:all:${region}:${topic}:${sources.join(",")}`;
  return query ? `news:search:${region}:${query}` : `news:${tab}:${region}:${topic}`;
}

export function newsFeed(request: FeedRequest): PolledDefinition<NewsPayload> {
  const { tab, region, topic, sources, query } = request;
  return {
    cacheKey: feedKey(request),
    intervalMs: NEWS_REFRESH_MS,
    parse: parseCachedNews,
    fetch: (signal) => {
      if (tab === "all") return fetchMergedFeeds(sources, region, topic, signal);
      return query ? fetchSearch(query, region, signal) : fetchFeed(tab, region, topic, signal);
    },
  };
}

export function newsTrends(region: TrendRegion): PolledDefinition<TrendsFeed> {
  return {
    cacheKey: trendsKey(region),
    intervalMs: NEWS_REFRESH_MS,
    parse: parseCachedTrends,
    fetch: (signal) => fetchTrends(region, signal),
  };
}
