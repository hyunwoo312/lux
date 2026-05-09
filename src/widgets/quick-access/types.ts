export type QuickLink = {
  id: string;
  title: string;
  url: string;
};

export type QuickAccessTab = "home" | "bookmarks" | "recentlyClosed" | "history";
export type OpenBehavior = "currentTab" | "newTab";
export type QuickAccessView = "grid" | "list";

export type BrowserItem = {
  id: string;
  title: string;
  url: string;
};
