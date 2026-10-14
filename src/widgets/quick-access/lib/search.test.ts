import { describe, expect, it } from "vitest";
import { searchBookmarks, searchBookmarksWithContext } from "@/widgets/quick-access/lib/search";
import type { BookmarkFolder, BrowserItem } from "@/widgets/quick-access/types";

const item = (id: string, title: string, url: string): BrowserItem => ({ id, title, url });

describe("searchBookmarks", () => {
  const tree: BookmarkFolder = {
    id: "root",
    title: "",
    items: [item("a", "Top level", "https://a.test/")],
    folders: [
      {
        id: "work",
        title: "Work",
        items: [item("b", "Design docs", "https://docs.test/")],
        folders: [
          {
            id: "deep",
            title: "Deep",
            items: [item("c", "Buried treasure", "https://deep.test/")],
            folders: [],
          },
        ],
      },
    ],
  };

  it("reaches a bookmark nested several folders down", () => {
    expect(searchBookmarks(tree, "buried")[0]?.id).toBe("c");
  });

  it("searches every level at once, not just the folder you are in", () => {
    expect(searchBookmarks(tree, "test").map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("returns nothing for an empty query rather than the whole tree", () => {
    expect(searchBookmarks(tree, "   ")).toEqual([]);
  });

  it("stops at the limit instead of walking an enormous tree", () => {
    expect(searchBookmarks(tree, "test", 2)).toHaveLength(2);
  });

  it("never lists the same bookmark twice", () => {
    const ids = searchBookmarks(tree, "test").map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("retains collection context without counting the browser root as a collection", () => {
    const found = searchBookmarksWithContext(tree, "test");
    expect(found.map((entry) => [entry.item.id, entry.context])).toEqual([
      ["a", "Bookmarks"],
      ["b", "Work"],
      ["c", "Work / Deep"],
    ]);
    expect(searchBookmarksWithContext(tree, "test", 2)).toHaveLength(2);
  });
});
