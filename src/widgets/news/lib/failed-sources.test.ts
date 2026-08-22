// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/net", async () => {
  const actual = await vi.importActual<typeof import("@/lib/net")>("@/lib/net");
  return { ...actual };
});

import { fetchMergedFeeds, readFailedSources } from "@/widgets/news/lib/news";

const FEED = `<?xml version="1.0"?><rss><channel><item>
  <title>Headline</title><link>https://example.com/a</link><guid>a</guid>
</item></channel></rss>`;

function respondWith(failing: Set<string>) {
  vi.stubGlobal("fetch", (url: string) =>
    [...failing].some((token) => String(url).includes(token))
      ? Promise.resolve(new Response("nope", { status: 500 }))
      : Promise.resolve(new Response(FEED, { status: 200 })),
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("readFailedSources", () => {
  it("names the sources that did not answer", async () => {
    respondWith(new Set(["bbci.co.uk"]));

    await fetchMergedFeeds(["bbc", "guardian"], "us", "top", undefined, "key-1");

    expect(readFailedSources("key-1")).toEqual(["bbc"]);
  });

  it("reports nothing once every source answers again", async () => {
    respondWith(new Set(["bbci.co.uk"]));
    await fetchMergedFeeds(["bbc", "guardian"], "us", "top", undefined, "key-2");
    expect(readFailedSources("key-2")).toEqual(["bbc"]);

    respondWith(new Set());
    await fetchMergedFeeds(["bbc", "guardian"], "us", "top", undefined, "key-2");
    expect(readFailedSources("key-2")).toEqual([]);
  });

  it("still throws when every source fails, rather than reporting a quiet partial", async () => {
    respondWith(new Set(["bbci.co.uk", "theguardian.com"]));

    await expect(
      fetchMergedFeeds(["bbc", "guardian"], "us", "top", undefined, "key-3"),
    ).rejects.toThrow();
  });

  it("knows nothing about a key it has never fetched", () => {
    expect(readFailedSources("never-used")).toEqual([]);
  });
});
