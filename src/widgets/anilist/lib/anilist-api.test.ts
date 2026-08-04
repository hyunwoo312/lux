import { describe, expect, it } from "vitest";
import { parseCachedCurrent } from "@/widgets/anilist/lib/anilist-api";

const entry = {
  id: 1,
  kind: "anime",
  title: "Frieren",
  siteUrl: "https://anilist.co/anime/1",
  progress: 4,
  total: 28,
  behind: 2,
  status: "CURRENT",
};

describe("parseCachedCurrent", () => {
  it("restores a cache written from a live list response", () => {
    const parsed = parseCachedCurrent({ entries: [entry], scoreFormat: "POINT_100" });

    expect(parsed?.entries).toHaveLength(1);
    expect(parsed?.entries[0]?.title).toBe("Frieren");
  });

  it("still restores a cache written before the waiting totals were dropped", () => {
    const parsed = parseCachedCurrent({
      entries: [entry],
      waiting: { episodes: 3, chapters: 0 },
      scoreFormat: "POINT_100",
    });

    expect(parsed?.entries).toHaveLength(1);
  });

  it("falls back to the default score format when the cache predates it", () => {
    const parsed = parseCachedCurrent({ entries: [entry] });

    expect(parsed?.scoreFormat).toBe("POINT_10");
  });

  it("rejects a cache whose entries are malformed", () => {
    expect(parseCachedCurrent({ entries: [{ id: 1 }], scoreFormat: "POINT_100" })).toBeNull();
  });
});
