import { describe, expect, it } from "vitest";
import { selectHeadlines } from "@/widgets/news/lib/select-headlines";
import type { NewsItem } from "@/widgets/news/types";

function item(title: string, source = "BBC News", publishedAt: number | null = 0): NewsItem {
  return {
    id: title,
    title,
    link: "https://example.com",
    source,
    sourceKey: "bbc",
    sourceUrl: null,
    publishedAt,
    image: null,
    dek: null,
    related: [],
  };
}

const NONE = {
  mutedTerms: [],
  highlightTerms: [],
  filterQuery: "",
  sortByLatest: false,
  readTitles: new Set<string>(),
  newTitles: new Set<string>(),
};

describe("selectHeadlines", () => {
  it("passes everything through when nothing is configured", () => {
    const result = selectHeadlines([item("One"), item("Two")], NONE);
    expect(result.status).toBe("ready");
    expect(result.status === "ready" && result.entries).toHaveLength(2);
  });

  it("drops headlines containing a muted term, case-insensitively", () => {
    const result = selectHeadlines([item("Crypto surges"), item("Rain expected")], {
      ...NONE,
      mutedTerms: ["CRYPTO"],
    });
    expect(result.status === "ready" && result.entries[0]?.item.title).toBe("Rain expected");
  });

  it("says so when muting hides every headline, rather than looking empty", () => {
    expect(selectHeadlines([item("Crypto")], { ...NONE, mutedTerms: ["crypto"] }).status).toBe(
      "muted",
    );
  });

  it("filters on the source as well as the headline", () => {
    const result = selectHeadlines([item("One", "BBC News"), item("Two", "NPR")], {
      ...NONE,
      filterQuery: "npr",
    });
    expect(result.status === "ready" && result.entries).toHaveLength(1);
  });

  it("distinguishes a filter that matched nothing from muting", () => {
    expect(selectHeadlines([item("One")], { ...NONE, filterQuery: "zzz" }).status).toBe(
      "unmatched",
    );
  });

  it("puts the newest first only when asked", () => {
    const items = [item("Old", "BBC News", 1), item("New", "BBC News", 9)];
    expect(selectHeadlines(items, NONE).status === "ready").toBe(true);
    const sorted = selectHeadlines(items, { ...NONE, sortByLatest: true });
    expect(sorted.status === "ready" && sorted.entries[0]?.item.title).toBe("New");
  });

  it("counts only unseen headlines you have not already opened", () => {
    const result = selectHeadlines([item("Fresh"), item("Opened")], {
      ...NONE,
      newTitles: new Set(["fresh", "opened"]),
      readTitles: new Set(["opened"]),
    });
    expect(result.status === "ready" && result.newCount).toBe(1);
  });

  it("floats headlines matching a highlight keyword to the top", () => {
    const result = selectHeadlines([item("Rain expected"), item("Climate summit opens")], {
      ...NONE,
      highlightTerms: ["climate"],
    });

    expect(result.status === "ready" && result.entries[0]?.item.title).toBe("Climate summit opens");
    expect(result.status === "ready" && result.highlightCount).toBe(1);
  });

  it("leaves the order alone when no keyword matches", () => {
    const result = selectHeadlines([item("One"), item("Two")], {
      ...NONE,
      highlightTerms: ["zzz"],
    });

    expect(result.status === "ready" && result.entries[0]?.item.title).toBe("One");
    expect(result.status === "ready" && result.highlightCount).toBe(0);
  });

  it("floats without discarding anything", () => {
    const result = selectHeadlines([item("A"), item("Climate"), item("B")], {
      ...NONE,
      highlightTerms: ["climate"],
    });
    expect(result.status === "ready" && result.entries).toHaveLength(3);
  });
});
