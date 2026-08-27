import { z } from "zod";
import { ensureOk, readCappedText, withTimeout } from "@/lib/net";
import type { TrendItem, TrendNews, TrendsFeed } from "@/widgets/news/types";

const TRENDS_ENDPOINT = "https://trends.google.com/trending/rss";
const CACHE_SHAPE = 1;

export function trendsKey(region: string): string {
  return `trends:v${CACHE_SHAPE}:${region}`;
}
const MAX_NEWS = 3;

function childText(node: Element, localName: string): string {
  for (const child of node.children) {
    if (child.localName === localName) return child.textContent?.trim() ?? "";
  }
  return "";
}

function children(node: Element, localName: string): Element[] {
  return [...node.children].filter((child) => child.localName === localName);
}

function newsFrom(node: Element): TrendNews | null {
  const title = childText(node, "news_item_title");
  const url = childText(node, "news_item_url");
  if (!title || !url) return null;
  return {
    title,
    url,
    source: childText(node, "news_item_source"),
    imageUrl: childText(node, "news_item_picture") || null,
  };
}

export function parseTrends(xml: string, region: string): TrendsFeed {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Trends feed returned invalid XML");

  const items = [...doc.getElementsByTagName("item")].flatMap((node): TrendItem[] => {
    const term = childText(node, "title");
    if (!term) return [];
    return [
      {
        term,
        trafficLabel: childText(node, "approx_traffic"),
        imageUrl: childText(node, "picture") || null,
        news: children(node, "news_item")
          .flatMap((entry) => {
            const news = newsFrom(entry);
            return news ? [news] : [];
          })
          .slice(0, MAX_NEWS),
      },
    ];
  });

  if (items.length === 0) throw new Error("Trends feed had nothing in it");
  return { region, items };
}

export async function fetchTrends(region: string, signal?: AbortSignal): Promise<TrendsFeed> {
  const response = await fetch(`${TRENDS_ENDPOINT}?geo=${encodeURIComponent(region)}`, {
    signal: withTimeout(signal),
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  ensureOk(response, "Trends request failed");
  return parseTrends(await readCappedText(response), region);
}

const newsSchema = z.object({
  title: z.string(),
  url: z.string(),
  source: z.string(),
  imageUrl: z.string().nullable(),
});

const feedSchema = z.object({
  region: z.string(),
  items: z.array(
    z.object({
      term: z.string(),
      trafficLabel: z.string(),
      imageUrl: z.string().nullable(),
      news: z.array(newsSchema),
    }),
  ),
});

export function parseCachedTrends(raw: unknown): TrendsFeed | null {
  const result = feedSchema.safeParse(raw);
  return result.success ? result.data : null;
}
