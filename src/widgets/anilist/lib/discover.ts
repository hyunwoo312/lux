import type { DiscoverFeed, DiscoverType } from "@/widgets/anilist/types";

export type DiscoverVariables = {
  type: "ANIME" | "MANGA";
  sort: string[];
  season?: "WINTER" | "SPRING" | "SUMMER" | "FALL";
  seasonYear?: number;
  status?: "NOT_YET_RELEASED";
};

const SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"] as const;

export function currentSeason(now: Date): { season: (typeof SEASONS)[number]; year: number } {
  const month = now.getMonth();
  if (month === 11) return { season: "WINTER", year: now.getFullYear() + 1 };
  return { season: SEASONS[Math.floor((month + 1) / 3)] ?? "WINTER", year: now.getFullYear() };
}

export function buildDiscoverVariables(
  feed: DiscoverFeed,
  type: DiscoverType,
  now: Date,
): DiscoverVariables {
  const mediaType = type === "manga" ? "MANGA" : "ANIME";
  const seasonal = mediaType === "ANIME" ? currentSeason(now) : null;

  if (feed === "upcoming") {
    return { type: mediaType, sort: ["POPULARITY_DESC"], status: "NOT_YET_RELEASED" };
  }
  if (feed === "season") {
    return {
      type: mediaType,
      sort: ["POPULARITY_DESC"],
      ...(seasonal ? { season: seasonal.season, seasonYear: seasonal.year } : {}),
    };
  }
  if (feed === "top") {
    return {
      type: mediaType,
      sort: ["SCORE_DESC"],
      ...(seasonal ? { season: seasonal.season, seasonYear: seasonal.year } : {}),
    };
  }
  return { type: mediaType, sort: ["TRENDING_DESC"] };
}

export function discoverFeedLabel(feed: DiscoverFeed, type: DiscoverType): string {
  const seasonal = type === "anime";
  if (feed === "upcoming") return "Upcoming";
  if (feed === "season") return seasonal ? "Popular this season" : "Popular";
  if (feed === "top") return seasonal ? "Top rated this season" : "Top rated";
  return "Trending now";
}
