import {
  flattenBookmarks,
  historyToItem,
  searchHistory,
  sessionToItem,
} from "@/widgets/quick-access/browser";

describe("flattenBookmarks", () => {
  it("collects nested url nodes and skips folders", () => {
    const tree = [
      {
        id: "0",
        title: "root",
        children: [
          { id: "1", title: "Folder", children: [{ id: "2", title: "GitHub", url: "https://github.com/" }] },
          { id: "3", title: "Mail", url: "https://mail.google.com/" },
        ],
      },
    ] as chrome.bookmarks.BookmarkTreeNode[];

    expect(flattenBookmarks(tree)).toEqual([
      { id: "2", title: "GitHub", url: "https://github.com/" },
      { id: "3", title: "Mail", url: "https://mail.google.com/" },
    ]);
  });
});

describe("sessionToItem", () => {
  it("reads a closed tab", () => {
    const session = { tab: { sessionId: "s1", title: "Docs", url: "https://docs.com/" } };
    expect(sessionToItem(session as chrome.sessions.Session)).toEqual({
      id: "closed-s1",
      title: "Docs",
      url: "https://docs.com/",
    });
  });

  it("falls back to the first tab of a closed window", () => {
    const session = { window: { tabs: [{ url: "https://a.com/" }, { url: "https://b.com/" }] } };
    expect(sessionToItem(session as chrome.sessions.Session)?.url).toBe("https://a.com/");
  });

  it("returns null without a url", () => {
    expect(sessionToItem({} as chrome.sessions.Session)).toBeNull();
  });
});

describe("historyToItem", () => {
  it("uses url as title when title is missing", () => {
    expect(historyToItem({ id: "h1", url: "https://x.com/" } as chrome.history.HistoryItem)).toEqual({
      id: "h1",
      title: "https://x.com/",
      url: "https://x.com/",
    });
  });
});

describe("searchHistory", () => {
  it("dedupes by url, drops non-http entries, and caps the limit", async () => {
    const chromeRef = (globalThis as unknown as { chrome: typeof chrome }).chrome;
    chromeRef.history.search = (async () => [
      { id: "1", url: "https://a.com/", title: "A" },
      { id: "2", url: "https://a.com/", title: "A again" },
      { id: "3", url: "chrome://flags", title: "Flags" },
      { id: "4", url: "https://b.com/", title: "B" },
    ]) as typeof chrome.history.search;

    const items = await searchHistory("a", 2);

    expect(items.map((item) => item.url)).toEqual(["https://a.com/", "https://b.com/"]);
  });
});
