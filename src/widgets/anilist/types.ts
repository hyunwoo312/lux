export const ANILIST_TABS = ["activity", "current", "inbox", "discover"] as const;
export type AnilistTab = (typeof ANILIST_TABS)[number];

export const ANILIST_MAX_ITEMS = 100;
export const ANILIST_PAGE_SIZE = 20;

export const MEDIA_FILTERS = ["both", "anime", "manga"] as const;
export type MediaFilter = (typeof MEDIA_FILTERS)[number];

export const CURRENT_SORTS = ["waiting", "recent", "score"] as const;
export type CurrentSort = (typeof CURRENT_SORTS)[number];

export const TITLE_LANGUAGES = ["english", "romaji", "native"] as const;
export type TitleLanguage = (typeof TITLE_LANGUAGES)[number];

export const SCORE_FORMATS = [
  "POINT_100",
  "POINT_10_DECIMAL",
  "POINT_10",
  "POINT_5",
  "POINT_3",
] as const;
export type ScoreFormat = (typeof SCORE_FORMATS)[number];

export type MediaKind = "anime" | "manga";

export type CurrentEntry = {
  id: number;
  kind: MediaKind;
  title: string;
  coverImage?: string;
  coverColor?: string;
  siteUrl: string;
  progress: number;
  total: number | null;
  behind: number | null;
  nextEpisode?: { episode: number; airingAt: number };
  score?: number;
  updatedAt?: number;
};

export type WaitingTotals = { episodes: number; chapters: number };

export type CurrentData = {
  entries: CurrentEntry[];
  waiting: WaitingTotals;
  scoreFormat: ScoreFormat;
};

export type AnilistNotification = {
  id: number;
  text: string;
  createdAt: string;
  imageUrl?: string;
  imageKind?: "cover" | "avatar";
  url?: string;
};

export type AnilistActivity = {
  id: number;
  kind: "list" | "text";
  createdAt: number;
  userName: string;
  userAvatar?: string;
  text: string;
  mediaTitle?: string;
  coverImage?: string;
  siteUrl: string;
  isLiked: boolean;
};

export type DiscoverMedia = {
  id: number;
  kind: MediaKind;
  title: string;
  coverImage?: string;
  coverColor?: string;
  format?: string;
  siteUrl: string;
};
