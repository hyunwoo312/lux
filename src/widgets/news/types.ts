import type { AccentPreset } from "@/widgets/core/accent";

export const NEWS_ACCENT: AccentPreset = "rose";

export const NEWS_SOURCES = ["bbc", "google", "guardian", "npr", "nyt", "yahoo"] as const;
export type NewsSource = (typeof NEWS_SOURCES)[number];

export const NEWS_TABS = ["all", ...NEWS_SOURCES] as const;
export type NewsTab = (typeof NEWS_TABS)[number];

export const NEWS_LAYOUTS = ["list", "tiles"] as const;
export type NewsLayout = (typeof NEWS_LAYOUTS)[number];

export const NEWS_REGIONS = ["us", "uk", "au", "international"] as const;
export type NewsRegion = (typeof NEWS_REGIONS)[number];

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  sourceKey: NewsSource | null;
  sourceUrl: string | null;
  publishedAt: number | null;
  image: string | null;
};
