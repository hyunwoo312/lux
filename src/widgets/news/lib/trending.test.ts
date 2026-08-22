// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { parseCachedTrends, parseTrends } from "@/widgets/news/lib/trending";

const FEED = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<rss xmlns:ht="https://trends.google.com/trending/rss" version="2.0">
  <channel>
    <title>Daily Search Trends</title>
    <item>
      <title>shay whitcomb</title>
      <ht:approx_traffic>20K+</ht:approx_traffic>
      <pubDate>Mon, 24 Aug 2026 19:40:00 -0700</pubDate>
      <ht:picture>https://encrypted-tbn0.gstatic.com/images?q=one</ht:picture>
      <ht:picture_source>CBS Sports</ht:picture_source>
      <ht:news_item>
        <ht:news_item_title>Giants' Shay Whitcomb: Called up Monday</ht:news_item_title>
        <ht:news_item_url>https://www.cbssports.com/one</ht:news_item_url>
        <ht:news_item_picture>https://encrypted-tbn0.gstatic.com/images?q=news</ht:news_item_picture>
        <ht:news_item_source>CBS Sports</ht:news_item_source>
      </ht:news_item>
      <ht:news_item>
        <ht:news_item_title>Giants recall Whitcomb</ht:news_item_title>
        <ht:news_item_url>https://www.nbcsports.com/two</ht:news_item_url>
        <ht:news_item_source>NBC Sports</ht:news_item_source>
      </ht:news_item>
      <ht:news_item>
        <ht:news_item_title>No link here</ht:news_item_title>
        <ht:news_item_source>Nowhere</ht:news_item_source>
      </ht:news_item>
    </item>
    <item>
      <title>手越祐也</title>
      <ht:approx_traffic>200+</ht:approx_traffic>
      <pubDate>Mon, 24 Aug 2026 18:00:00 -0700</pubDate>
    </item>
  </channel>
</rss>`;

describe("parseTrends", () => {
  it("reads every trending term in feed order", () => {
    expect(parseTrends(FEED, "US").items.map((item) => item.term)).toEqual([
      "shay whitcomb",
      "手越祐也",
    ]);
  });

  it("reads the namespaced traffic, picture and source", () => {
    const [first] = parseTrends(FEED, "US").items;
    expect(first?.trafficLabel).toBe("20K+");
    expect(first?.traffic).toBe(20_000);
    expect(first?.imageUrl).toBe("https://encrypted-tbn0.gstatic.com/images?q=one");
    expect(first?.imageSource).toBe("CBS Sports");
  });

  it("reads when the term started trending", () => {
    const [first] = parseTrends(FEED, "US").items;
    expect(first?.startedAt).toBe(Date.parse("Mon, 24 Aug 2026 19:40:00 -0700"));
  });

  it("keeps the related headlines with their source", () => {
    const [first] = parseTrends(FEED, "US").items;
    expect(first?.news[0]).toEqual({
      title: "Giants' Shay Whitcomb: Called up Monday",
      url: "https://www.cbssports.com/one",
      source: "CBS Sports",
      imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=news",
    });
  });

  it("drops a headline with nowhere to go", () => {
    const [first] = parseTrends(FEED, "US").items;
    expect(first?.news.map((news) => news.title)).toEqual([
      "Giants' Shay Whitcomb: Called up Monday",
      "Giants recall Whitcomb",
    ]);
  });

  it("copes with a term that has no picture or headlines", () => {
    const second = parseTrends(FEED, "US").items[1];
    expect(second?.imageUrl).toBeNull();
    expect(second?.news).toEqual([]);
  });

  it("remembers which region the feed was for", () => {
    expect(parseTrends(FEED, "JP").region).toBe("JP");
  });

  it("refuses a response that is not XML", () => {
    expect(() => parseTrends("<html>nope", "US")).toThrow();
  });

  it("refuses a feed with no trends in it", () => {
    expect(() => parseTrends("<rss><channel/></rss>", "US")).toThrow(
      "Trends feed had nothing in it",
    );
  });
});

describe("parseCachedTrends", () => {
  it("reads back what it wrote", () => {
    const feed = parseTrends(FEED, "US");
    expect(parseCachedTrends(JSON.parse(JSON.stringify(feed)))).toEqual(feed);
  });

  it("refuses a cache from an older shape", () => {
    expect(parseCachedTrends({ region: "US", items: [{ term: "a" }] })).toBeNull();
  });
});
