import { describe, expect, it } from "vitest";
import { filterItems, searchBookmarks } from "@/widgets/quick-access/lib/search";
import type { BookmarkFolder, BrowserItem } from "@/widgets/quick-access/types";

const item = (id: string, title: string, url: string): BrowserItem => ({ id, title, url });

const ITEMS = [
  item("1", "GitHub", "https://github.com/"),
  item("2", "Hacker News", "https://news.ycombinator.com/"),
];

describe("filterItems", () => {
  it("hands back the same list when nothing is typed", () => {
    expect(filterItems(ITEMS, "  ")).toBe(ITEMS);
  });

  it("matches the title, case-insensitively", () => {
    expect(filterItems(ITEMS, "github")).toHaveLength(1);
  });

  it("matches the url as well, so a domain finds a page you cannot name", () => {
    expect(filterItems(ITEMS, "ycombinator")[0]?.title).toBe("Hacker News");
  });

  it("reads no matches as an empty list, not as everything", () => {
    expect(filterItems(ITEMS, "zzz")).toEqual([]);
  });
});

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
});
