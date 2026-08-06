import {
  historyToItem,
  resolveFolderTrail,
  restoreSession,
  searchHistory,
  sessionToItem,
  toBookmarkFolder,
} from "@/widgets/quick-access/browser";

const TREE = {
  id: "0",
  title: "",
  children: [
    {
      id: "1",
      title: "Bar",
      children: [
        { id: "2", title: "GitHub", url: "https://github.com/" },
        { id: "4", title: "", children: [{ id: "5", title: "Deep", url: "https://deep.com/" }] },
      ],
    },
    { id: "3", title: "Mail", url: "https://mail.google.com/" },
  ],
} as chrome.bookmarks.BookmarkTreeNode;

describe("toBookmarkFolder", () => {
  it("keeps folders and links apart instead of flattening them together", () => {
    const root = toBookmarkFolder(TREE, "Bookmarks");

    expect(root.title).toBe("Bookmarks");
    expect(root.folders.map((folder) => folder.id)).toEqual(["1"]);
    expect(root.items.map((item) => item.id)).toEqual(["3"]);
    expect(root.folders[0]?.items.map((item) => item.id)).toEqual(["2"]);
  });

  it("names an untitled folder rather than showing a blank row", () => {
    const root = toBookmarkFolder(TREE, "Bookmarks");

    expect(root.folders[0]?.folders[0]?.title).toBe("Folder");
  });
});

describe("resolveFolderTrail", () => {
  it("returns the breadcrumb down to the requested folder", () => {
    const root = toBookmarkFolder(TREE, "Bookmarks");

    expect(resolveFolderTrail(root, ["1", "4"]).map((folder) => folder.title)).toEqual([
      "Bookmarks",
      "Bar",
      "Folder",
    ]);
  });

  it("stops at the last folder that still exists when one was deleted", () => {
    const root = toBookmarkFolder(TREE, "Bookmarks");

    expect(resolveFolderTrail(root, ["1", "gone", "4"]).map((folder) => folder.id)).toEqual([
      "0",
      "1",
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
      sessionId: "s1",
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
    expect(
      historyToItem({ id: "h1", url: "https://x.com/" } as chrome.history.HistoryItem),
    ).toEqual({
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

describe("restoreSession", () => {
  it("restores the closed tab through the sessions API", async () => {
    const chromeRef = (globalThis as unknown as { chrome: typeof chrome }).chrome;
    const restore = vi.fn(async () => undefined);
    chromeRef.sessions.restore = restore as unknown as typeof chrome.sessions.restore;

    await expect(restoreSession("s1")).resolves.toBe(true);
    expect(restore).toHaveBeenCalledWith("s1");
  });

  it("reports failure so the caller can fall back instead of doing nothing", async () => {
    const chromeRef = (globalThis as unknown as { chrome: typeof chrome }).chrome;
    chromeRef.sessions.restore = (async () => {
      throw new Error("Session expired");
    }) as unknown as typeof chrome.sessions.restore;

    await expect(restoreSession("gone")).resolves.toBe(false);
  });
});
