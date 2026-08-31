import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/browser", () => ({
  fetchOpenTabs: vi.fn(async () => []),
  fetchTopSites: vi.fn(async () => []),
  focusTab: vi.fn(async () => undefined),
  searchBookmarks: vi.fn(async () => []),
  searchHistory: vi.fn(async () => []),
}));

vi.mock("@/lib/permissions", () => ({ getGrantedPermissions: vi.fn(() => new Set()) }));

vi.mock("@/lib/favicon", () => ({ faviconUrl: () => null }));

vi.mock("@/lib/open-url", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/open-url")>()),
  openUrl: vi.fn(),
}));

import {
  fetchOpenTabs,
  fetchTopSites,
  focusTab,
  searchBookmarks,
  searchHistory,
} from "@/lib/browser";
import { getGrantedPermissions } from "@/lib/permissions";
import { openUrl } from "@/lib/open-url";
import { linkItems } from "@/commands/links";

const grant = (...names: string[]) =>
  vi.mocked(getGrantedPermissions).mockReturnValue(new Set(names) as never);

beforeEach(() => {
  vi.clearAllMocks();
  grant();
});

describe("linkItems", () => {
  it("asks nothing of a source the user has not granted", async () => {
    grant("bookmarks");
    vi.mocked(searchBookmarks).mockResolvedValue([
      { id: "b1", title: "Docs", url: "https://example.com/docs" },
    ]);

    const items = await linkItems("docs");

    expect(searchBookmarks).toHaveBeenCalled();
    expect(searchHistory).not.toHaveBeenCalled();
    expect(fetchOpenTabs).not.toHaveBeenCalled();
    expect(fetchTopSites).not.toHaveBeenCalled();
    expect(items).toHaveLength(1);
  });

  it("shows a page once even when several sources know it", async () => {
    grant("bookmarks", "history");
    vi.mocked(searchBookmarks).mockResolvedValue([
      { id: "b1", title: "Docs", url: "https://example.com/docs" },
    ]);
    vi.mocked(searchHistory).mockResolvedValue([
      { id: "h1", title: "Docs", url: "https://example.com/docs" },
    ]);

    const items = await linkItems("docs");

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      label: "Docs",
      detail: "example.com/docs",
      meta: "Bookmark",
    });
  });

  it("switches to an open tab rather than opening another copy", async () => {
    grant("tabs");
    vi.mocked(fetchOpenTabs).mockResolvedValue([
      { id: "tab-4", title: "Docs", url: "https://example.com/docs", tabId: 4, windowId: 2 },
    ]);

    const items = await linkItems("docs");
    const item = items[0];
    if (item?.effect !== "run") throw new Error("expected a runnable link");
    await item.run();

    expect(focusTab).toHaveBeenCalledWith(4, 2);
    expect(openUrl).not.toHaveBeenCalled();
  });

  it("stays quiet until the query is worth a lookup", async () => {
    grant("history");

    expect(await linkItems("  ")).toEqual([]);
    expect(searchHistory).not.toHaveBeenCalled();
  });
});
