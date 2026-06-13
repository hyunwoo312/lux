export type QuickLink = {
  id: string;
  title: string;
  url: string;
};

export type QuickAccessTab = "home" | "bookmarks" | "recentlyClosed" | "history";
export type BrowserSource = Exclude<QuickAccessTab, "home"> | "topSites";
export type { OpenBehavior } from "@/lib/open-url";
export type QuickAccessView = "grid" | "list";

export type BrowserItem = {
  id: string;
  title: string;
  url: string;
};
