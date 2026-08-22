import type { AccentPreset } from "@/widgets/core/accent";

export const NEWS_ACCENT: AccentPreset = "rose";

export const NEWS_SOURCES = ["bbc", "google", "guardian", "npr", "nyt", "yahoo"] as const;
export type NewsSource = (typeof NEWS_SOURCES)[number];

export const NEWS_TABS = ["all", ...NEWS_SOURCES] as const;
export type NewsTab = (typeof NEWS_TABS)[number];

export const NEWS_VIEWS = ["news", "trending"] as const;
export type NewsView = (typeof NEWS_VIEWS)[number];

export type TrendNews = {
  title: string;
  url: string;
  source: string;
  imageUrl: string | null;
};

export type TrendItem = {
  term: string;
  trafficLabel: string;
  traffic: number | null;
  startedAt: number | null;
  imageUrl: string | null;
  imageSource: string | null;
  news: TrendNews[];
};

export type TrendsFeed = {
  region: string;
  items: TrendItem[];
};

export type TrendMovement =
  | { kind: "new" }
  | { kind: "up"; places: number }
  | { kind: "down"; places: number }
  | { kind: "steady" };

export const NEWS_LAYOUTS = ["list", "tiles"] as const;
export type NewsLayout = (typeof NEWS_LAYOUTS)[number];

export const NEWS_REGIONS = ["us", "uk", "au", "international"] as const;
export type NewsRegion = (typeof NEWS_REGIONS)[number];

export const NEWS_TOPICS = ["top", "world", "business", "technology", "science", "sports"] as const;
export type NewsTopic = (typeof NEWS_TOPICS)[number];

export const MAX_BOOKMARKS = 200;

export type RelatedStory = { source: string; link: string };

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  sourceKey: NewsSource | null;
  sourceUrl: string | null;
  publishedAt: number | null;
  image: string | null;
  dek: string | null;
  related: RelatedStory[];
};

export type Bookmark = { item: NewsItem; savedAt: number };
