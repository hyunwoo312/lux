import type { DiscoverFeed, DiscoverType, TitleLanguage } from "@/widgets/anilist/types";

export const anilistKeys = {
  activity: (viewerId: number, lang: TitleLanguage) => `anilist:activity:${viewerId}:${lang}`,
  inbox: (viewerId: number, lang: TitleLanguage) => `anilist:inbox:${viewerId}:${lang}`,
  unread: (viewerId: number) => `anilist:unread:${viewerId}`,
  library: (viewerId: number, lang: TitleLanguage) => `anilist:library:${viewerId}:${lang}`,
  discover: (lang: TitleLanguage, feed: DiscoverFeed, type: DiscoverType) =>
    `anilist:discover:${lang}:${feed}:${type}`,
} as const;
