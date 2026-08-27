// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMergedFeeds } from "@/widgets/news/lib/news";

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

describe("fetchMergedFeeds", () => {
  it("names the sources that did not answer alongside the headlines that did", async () => {
    respondWith(new Set(["bbci.co.uk"]));

    const payload = await fetchMergedFeeds(["bbc", "guardian"], "us", "top");

    expect(payload.missing).toEqual(["bbc"]);
    expect(payload.items).not.toHaveLength(0);
  });

  it("reports nothing once every source answers again", async () => {
    respondWith(new Set());

    expect((await fetchMergedFeeds(["bbc", "guardian"], "us", "top")).missing).toEqual([]);
  });

  it("still throws when every source fails, rather than reporting a quiet partial", async () => {
    respondWith(new Set(["bbci.co.uk", "theguardian.com"]));

    await expect(fetchMergedFeeds(["bbc", "guardian"], "us", "top")).rejects.toThrow();
  });
});
