import type { TitleLanguage } from "@/widgets/anilist/types";

export const anilistKeys = {
  activity: (viewerId: number, lang: TitleLanguage) => `anilist:activity:${viewerId}:${lang}`,
  inbox: (viewerId: number, lang: TitleLanguage) => `anilist:inbox:${viewerId}:${lang}`,
  unread: (viewerId: number) => `anilist:unread:${viewerId}`,
  current: (viewerId: number, lang: TitleLanguage) => `anilist:current:${viewerId}:${lang}`,
  discover: (lang: TitleLanguage) => `anilist:discover:${lang}`,
} as const;
