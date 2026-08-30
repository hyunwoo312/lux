import type { AccentPreset } from "@/widgets/core/accent";

export const QUICK_ACCESS_TINT: AccentPreset = "rose";

export const LOCAL_SEARCH_DEBOUNCE_MS = 180;

export type QuickLink = {
  id: string;
  title: string;
  url: string;
  icon?: string;
};

export type LinkResult = "ok" | "invalid" | "duplicate";

export type QuickAccessTab = "home" | "bookmarks" | "history";
export type ItemSource = "history" | "recentlyClosed" | "topSites" | "openTabs";
export type { OpenBehavior } from "@/lib/open-url";
export type { BookmarkFolder, BrowserItem } from "@/lib/browser";
export type QuickAccessView = "grid" | "list";

export type RemovedLink = { link: QuickLink; index: number };
