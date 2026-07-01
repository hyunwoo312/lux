import type { AccentPreset } from "@/widgets/core/accent";

export const NEWS_ACCENT: AccentPreset = "teal";

export const NEWS_SOURCES = ["google", "nyt", "bbc", "yahoo"] as const;
export type NewsSource = (typeof NEWS_SOURCES)[number];

export const NEWS_TOPICS = [
  "top",
  "world",
  "business",
  "technology",
  "science",
  "health",
  "sports",
  "entertainment",
] as const;
export type NewsTopic = (typeof NEWS_TOPICS)[number];

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  sourceUrl: string | null;
  publishedAt: number | null;
  image: string | null;
};
