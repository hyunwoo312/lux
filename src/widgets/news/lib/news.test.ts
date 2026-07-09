// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  feedUrl,
  mergeFeeds,
  parseCachedNews,
  parseFeed,
  resolveNewsTab,
  searchUrl,
} from "@/widgets/news/lib/news";
import type { NewsItem } from "@/widgets/news/types";

const rssFeed = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Example</title>
  <item>
    <title>Markets rally on rate cut - Reuters</title>
    <link>https://example.com/a</link>
    <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
    <source url="https://reuters.com">Reuters</source>
  </item>
  <item>
    <title>Second story</title>
    <link>https://example.com/b</link>
  </item>
  <item>
    <title>No link, dropped</title>
  </item>
</channel></rss>`;

describe("parseFeed", () => {
  it("parses RSS items into normalized headlines", () => {
    const items = parseFeed(rssFeed, "Google News");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: "Markets rally on rate cut",
      link: "https://example.com/a",
      source: "Reuters",
      sourceUrl: "https://reuters.com",
      publishedAt: Date.parse("Mon, 01 Jan 2024 12:00:00 GMT"),
    });
  });

  it("falls back to the source label and null date when absent", () => {
    const items = parseFeed(rssFeed, "Google News");
    expect(items[1]).toMatchObject({ source: "Google News", publishedAt: null, sourceUrl: null });
  });

  it("throws for malformed XML so the widget shows the error state", () => {
    expect(() => parseFeed("<not xml", "BBC")).toThrow();
  });

  it("extracts a media image url where present, null otherwise", () => {
    const feed = `<?xml version="1.0"?>
<rss xmlns:media="http://search.yahoo.com/mrss/" version="2.0"><channel>
  <item>
    <title>With image</title>
    <link>https://example.com/i</link>
    <media:thumbnail url="https://img.example.com/t.jpg" width="240"/>
  </item>
  <item>
    <title>No image</title>
    <link>https://example.com/n</link>
  </item>
</channel></rss>`;
    const items = parseFeed(feed, "BBC");
    expect(items[0]?.image).toBe("https://img.example.com/t.jpg");
    expect(items[1]?.image).toBeNull();
  });

  it("picks the smallest image variant at or above the preferred width", () => {
    const feed = `<?xml version="1.0"?>
<rss xmlns:media="http://search.yahoo.com/mrss/" version="2.0"><channel>
  <item>
    <title>Multi variant</title>
    <link>https://example.com/m</link>
    <media:content url="https://img.example.com/w140.jpg" width="140"/>
    <media:content url="https://img.example.com/w460.jpg" width="460"/>
    <media:content url="https://img.example.com/w1024.jpg" width="1024"/>
  </item>
  <item>
    <title>Only small</title>
    <link>https://example.com/s</link>
    <media:content url="https://img.example.com/w130.jpg" width="130"/>
  </item>
</channel></rss>`;
    const items = parseFeed(feed, "Yahoo News");
    expect(items[0]?.image).toBe("https://img.example.com/w460.jpg");
    expect(items[1]?.image).toBe("https://img.example.com/w130.jpg");
  });

  it("stamps items with the fetching source key", () => {
    const items = parseFeed(rssFeed, "Google News", "google");
    expect(items[0]?.sourceKey).toBe("google");
  });

  it("uses guid for the id and drops items that repeat one", () => {
    const feed = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item><title>First</title><link>https://ex.com/live</link><guid>guid-1</guid></item>
  <item><title>Second</title><link>https://ex.com/live</link><guid>guid-2</guid></item>
  <item><title>Repeat</title><link>https://ex.com/other</link><guid>guid-1</guid></item>
</channel></rss>`;
    const items = parseFeed(feed, "BBC");
    expect(items.map((entry) => entry.id)).toEqual(["guid-1", "guid-2"]);
  });

  it("drops items whose link is not an http(s) URL", () => {
    const feed = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item><title>Safe</title><link>https://example.com/ok</link></item>
  <item><title>Unsafe</title><link>javascript:alert(1)</link></item>
</channel></rss>`;
    const items = parseFeed(feed, "Example");
    expect(items).toHaveLength(1);
    expect(items[0]?.link).toBe("https://example.com/ok");
  });
});

describe("feedUrl", () => {
  it("maps a region to that source's edition feed", () => {
    expect(feedUrl("guardian", "uk")).toBe("https://www.theguardian.com/uk/rss");
    expect(feedUrl("bbc", "uk")).toBe("https://feeds.bbci.co.uk/news/uk/rss.xml");
  });

  it("uses the single feed for sources without editions", () => {
    expect(feedUrl("npr", "uk")).toBe(feedUrl("npr", "us"));
  });
});

function mergedItem(id: string, overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id,
    title: `Story ${id}`,
    link: `https://example.com/${id}`,
    source: "Example",
    sourceKey: null,
    sourceUrl: null,
    publishedAt: null,
    image: null,
    ...overrides,
  };
}

describe("mergeFeeds", () => {
  it("interleaves feeds by recency with unknown dates last", () => {
    const merged = mergeFeeds([
      [mergedItem("old", { publishedAt: 1_000 }), mergedItem("undated")],
      [mergedItem("new", { publishedAt: 2_000 })],
    ]);
    expect(merged.map((entry) => entry.id)).toEqual(["new", "old", "undated"]);
  });

  it("dedupes cross-source items by normalized title, preferring the one with an image", () => {
    const merged = mergeFeeds([
      [mergedItem("g", { title: "Rates fall, markets rally" })],
      [
        mergedItem("b", {
          title: "Rates fall — markets rally!",
          image: "https://img.test/a.jpg",
        }),
      ],
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("b");
  });
});

describe("resolveNewsTab", () => {
  it("keeps a valid selection and falls back to All otherwise", () => {
    expect(resolveNewsTab("bbc", ["google", "bbc"])).toBe("bbc");
    expect(resolveNewsTab("all", ["google", "bbc"])).toBe("all");
    expect(resolveNewsTab("nyt", ["google", "bbc"])).toBe("all");
  });

  it("resolves to the only enabled source when just one remains", () => {
    expect(resolveNewsTab("all", ["nyt"])).toBe("nyt");
    expect(resolveNewsTab("bbc", ["nyt"])).toBe("nyt");
  });
});

describe("searchUrl", () => {
  it("builds a Google News search feed with an encoded query and region locale", () => {
    const url = searchUrl("tesla stock", "uk");
    expect(url).toContain("https://news.google.com/rss/search?q=tesla%20stock");
    expect(url).toContain("gl=GB");
  });
});

describe("parseCachedNews", () => {
  it("accepts a well-formed cached list and rejects a bad one", () => {
    const valid = [
      {
        id: "a",
        title: "t",
        link: "https://example.com/a",
        source: "s",
        sourceKey: null,
        sourceUrl: null,
        publishedAt: null,
        image: null,
      },
    ];
    expect(parseCachedNews(valid)).toEqual(valid);
    expect(parseCachedNews([{ id: "a" }])).toBeNull();
    expect(parseCachedNews("nope")).toBeNull();
  });

  it("rejects cached items whose link is not an http(s) URL", () => {
    const item = {
      id: "a",
      title: "t",
      source: "s",
      sourceUrl: null,
      publishedAt: null,
      image: null,
    };
    expect(parseCachedNews([{ ...item, link: "javascript:alert(1)" }])).toBeNull();
    expect(
      parseCachedNews([{ ...item, link: "https://example.com/a", image: "data:text/html" }]),
    ).toBeNull();
  });

  it("defaults a missing image field to null for older cached items", () => {
    const cached = parseCachedNews([
      { id: "a", title: "t", link: "https://x.test", source: "s", publishedAt: null },
    ]);
    expect(cached?.[0]?.image).toBeNull();
  });
});
