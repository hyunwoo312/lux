import type { AccentPreset } from "@/widgets/core/accent";

export const QUICK_ACCESS_ACCENT: AccentPreset = "rose";

export type QuickLink = {
  id: string;
  title: string;
  url: string;
  icon?: string;
};

export type LinkResult = "ok" | "invalid" | "duplicate";

export type QuickAccessTab = "home" | "bookmarks" | "recentlyClosed" | "history";
export type ItemSource = Exclude<QuickAccessTab, "home" | "bookmarks"> | "topSites";
export type { OpenBehavior } from "@/lib/open-url";
export type QuickAccessView = "grid" | "list";

export type BrowserItem = {
  id: string;
  title: string;
  url: string;
  sessionId?: string;
};

export type RemovedLink = { link: QuickLink; index: number };

export type BookmarkFolder = {
  id: string;
  title: string;
  folders: BookmarkFolder[];
  items: BrowserItem[];
};
