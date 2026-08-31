import { describe, expect, it } from "vitest";
import { matchItems, score, scoreItem } from "@/commands/match";
import { usePaletteStore } from "@/stores/usePaletteStore";
import type { CommandItem } from "@/commands/items";
import { Search } from "lucide-react";

function item(partial: Partial<CommandItem> & { id: string; label: string }): CommandItem {
  return {
    section: "commands",
    icon: Search,
    effect: "run",
    run: () => {},
    ...partial,
  } as CommandItem;
}

describe("score", () => {
  it("ranks a prefix above a mid-word substring", () => {
    expect(score("Next track", "next")).toBeGreaterThan(score("Play next", "next") ?? 0);
  });

  it("ranks a word start above a mid-word match", () => {
    expect(score("Play next", "next")).toBeGreaterThan(score("Context", "ext") ?? 0);
  });

  it("matches a subsequence but ranks it below a substring", () => {
    const subsequence = score("Toggle shuffle", "tgs");
    expect(subsequence).not.toBeNull();
    expect(subsequence).toBeLessThan(score("Toggle shuffle", "shuffle") ?? 0);
  });

  it("returns null when the letters are not in order", () => {
    expect(score("Next track", "xen")).toBeNull();
  });
});

describe("scoreItem", () => {
  it("finds a command by a keyword the label does not contain", () => {
    const next = item({ id: "next", label: "Next track", keywords: ["skip"] });
    expect(scoreItem(next, "skip")).not.toBeNull();
  });

  it("prefers a label match over a keyword match", () => {
    const byLabel = item({ id: "a", label: "Skip ahead" });
    const byKeyword = item({ id: "b", label: "Next track", keywords: ["skip"] });
    expect(scoreItem(byLabel, "skip")).toBeGreaterThan(scoreItem(byKeyword, "skip") ?? 0);
  });
});

describe("matchItems", () => {
  const items = [
    item({ id: "shuffle", label: "Toggle shuffle", section: "commands" }),
    item({ id: "theme", label: "Toggle theme", section: "commands" }),
    item({ id: "web", label: "Search for \u201cshuffle\u201d", section: "search" }),
  ];

  it("puts a confident command match above the search row", () => {
    const ids = matchItems(items, "shuffle").map((entry) => entry.id);
    expect(ids[0]).toBe("shuffle");
  });

  it("hoists search to the top when nothing matches confidently", () => {
    const ids = matchItems(items, "asdf").map((entry) => entry.id);
    expect(ids[0]).toBe("web");
  });

  it("always offers search, however unsearchable the text looks", () => {
    const ids = matchItems(items, "!!!").map((entry) => entry.id);
    expect(ids).toEqual(["web"]);
  });
});

describe("frecency", () => {
  it("lifts what you actually pick above an equally good match", () => {
    const items = [
      item({ id: "a", label: "Toggle theme", section: "commands" }),
      item({ id: "b", label: "Toggle shuffle", section: "commands" }),
    ];

    expect(matchItems(items, "toggle").map((entry) => entry.id)).toEqual(["a", "b"]);

    usePaletteStore.setState({ usage: { b: { count: 5, at: Date.now() } } });

    expect(matchItems(items, "toggle").map((entry) => entry.id)).toEqual(["b", "a"]);
  });
});
