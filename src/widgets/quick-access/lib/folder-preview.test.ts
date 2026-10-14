import { describe, expect, it } from "vitest";
import { folderCountLabel, folderPreviews } from "@/widgets/quick-access/lib/folder-preview";
import type { BookmarkFolder } from "@/widgets/quick-access/types";

describe("folderPreviews", () => {
  it("counts immediate links and folders separately without claiming descendants are direct links", () => {
    const child: BookmarkFolder = {
      id: "child",
      title: "Research",
      folders: [],
      items: [{ id: "a", title: "Reference", url: "https://example.com/" }],
    };
    const root: BookmarkFolder = {
      id: "root",
      title: "Bookmarks",
      folders: [child],
      items: ["One", "Two", "Three", "Four"].map((title) => ({
        id: title,
        title,
        url: "https://example.com/",
      })),
    };
    const previews = folderPreviews(root);
    expect(previews.get("root")).toEqual({
      links: 4,
      folders: 1,
      titles: ["Research", "One", "Two"],
    });
    expect(previews.get("child")).toEqual({ links: 1, folders: 0, titles: ["Reference"] });
    expect(folderCountLabel(previews.get("root")!)).toBe("4 links · 1 folder");
    expect(folderCountLabel(previews.get("child")!)).toBe("1 link");
  });
});
