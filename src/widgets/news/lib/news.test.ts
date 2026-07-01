import { describe, expect, it } from "vitest";
import {
  feedUrl,
  parseCachedNews,
  parseFeed,
  relativeTime,
  searchUrl,
} from "@/widgets/news/lib/news";

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
  it("maps a supported topic to that source's section feed", () => {
    expect(feedUrl("bbc", "technology")).toBe("https://feeds.bbci.co.uk/news/technology/rss.xml");
  });

  it("falls back to the source's top feed for an unsupported topic", () => {
    expect(feedUrl("yahoo", "technology")).toBe(feedUrl("yahoo", "top"));
  });
});

describe("searchUrl", () => {
  it("builds a Google News search feed with an encoded query", () => {
    expect(searchUrl("tesla stock")).toContain(
      "https://news.google.com/rss/search?q=tesla%20stock",
    );
  });
});

describe("relativeTime", () => {
  it("formats minutes, hours, and days", () => {
    const now = Date.parse("2024-01-01T12:00:00Z");
    expect(relativeTime(now, now)).toBe("now");
    expect(relativeTime(now - 5 * 60_000, now)).toBe("5m");
    expect(relativeTime(now - 3 * 3_600_000, now)).toBe("3h");
    expect(relativeTime(now - 2 * 86_400_000, now)).toBe("2d");
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
