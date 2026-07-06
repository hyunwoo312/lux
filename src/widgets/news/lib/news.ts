import { z } from "zod";
import type { NewsItem, NewsSource, NewsTopic } from "@/widgets/news/types";

const MAX_ITEMS = 30;
const GOOGLE_LOCALE = "hl=en-US&gl=US&ceid=US:en";

type SourceMeta = {
  tab: string;
  label: string;
  topics: Partial<Record<NewsTopic, string>> & { top: string };
};

function googleTopic(topic: string): string {
  return `https://news.google.com/rss/headlines/section/topic/${topic}?${GOOGLE_LOCALE}`;
}

function nytSection(section: string): string {
  return `https://rss.nytimes.com/services/xml/rss/nyt/${section}.xml`;
}

const SOURCES: Record<NewsSource, SourceMeta> = {
  google: {
    tab: "Google",
    label: "Google News",
    topics: {
      top: `https://news.google.com/rss?${GOOGLE_LOCALE}`,
      world: googleTopic("WORLD"),
      business: googleTopic("BUSINESS"),
      technology: googleTopic("TECHNOLOGY"),
      science: googleTopic("SCIENCE"),
      health: googleTopic("HEALTH"),
      sports: googleTopic("SPORTS"),
      entertainment: googleTopic("ENTERTAINMENT"),
    },
  },
  nyt: {
    tab: "NYT",
    label: "The New York Times",
    topics: {
      top: nytSection("HomePage"),
      world: nytSection("World"),
      business: nytSection("Business"),
      technology: nytSection("Technology"),
      science: nytSection("Science"),
      health: nytSection("Health"),
      sports: nytSection("Sports"),
      entertainment: nytSection("Arts"),
    },
  },
  bbc: {
    tab: "BBC",
    label: "BBC News",
    topics: {
      top: "https://feeds.bbci.co.uk/news/rss.xml",
      world: "https://feeds.bbci.co.uk/news/world/rss.xml",
      business: "https://feeds.bbci.co.uk/news/business/rss.xml",
      technology: "https://feeds.bbci.co.uk/news/technology/rss.xml",
      science: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
      health: "https://feeds.bbci.co.uk/news/health/rss.xml",
      sports: "https://feeds.bbci.co.uk/sport/rss.xml",
      entertainment: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    },
  },
  yahoo: {
    tab: "Yahoo",
    label: "Yahoo News",
    topics: {
      top: "https://news.yahoo.com/rss/",
    },
  },
};

export function sourceTab(source: NewsSource): string {
  return SOURCES[source].tab;
}

export function sourceLabel(source: NewsSource): string {
  return SOURCES[source].label;
}

export function feedUrl(source: NewsSource, topic: NewsTopic): string {
  return SOURCES[source].topics[topic] ?? SOURCES[source].topics.top;
}

export function searchUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&${GOOGLE_LOCALE}`;
}

const THUMBNAIL_SOURCES = new Set<NewsSource>(["nyt", "bbc"]);

export function hasThumbnails(source: NewsSource): boolean {
  return THUMBNAIL_SOURCES.has(source);
}

function isHttpUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function stripSourceSuffix(title: string, source: string): string {
  const suffix = ` - ${source}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
}

function imageFromNode(node: Element): string | null {
  const media =
    node.getElementsByTagName("media:content")[0] ??
    node.getElementsByTagName("media:thumbnail")[0] ??
    node.getElementsByTagName("enclosure")[0];
  const url = media?.getAttribute("url")?.trim();
  return url && isHttpUrl(url) ? url : null;
}

export function parseFeed(xml: string, fallbackSource: string): NewsItem[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("News feed returned invalid XML");
  const nodes = [...doc.querySelectorAll("item"), ...doc.querySelectorAll("entry")];
  const seen = new Set<string>();
  return nodes
    .map((node): NewsItem => {
      const title = node.querySelector("title")?.textContent?.trim() ?? "";
      const linkNode = node.querySelector("link");
      const link = linkNode?.textContent?.trim() || linkNode?.getAttribute("href") || "";
      const guid = node.querySelector("guid, id")?.textContent?.trim();
      const published =
        node.querySelector("pubDate")?.textContent ??
        node.querySelector("updated")?.textContent ??
        "";
      const parsed = published ? Date.parse(published) : Number.NaN;
      const sourceNode = node.querySelector("source");
      const source = sourceNode?.textContent?.trim() || fallbackSource;
      const sourceUrlAttr = sourceNode?.getAttribute("url")?.trim();
      return {
        id: guid || link || title,
        title: stripSourceSuffix(title, source),
        link,
        source,
        sourceUrl: sourceUrlAttr && isHttpUrl(sourceUrlAttr) ? sourceUrlAttr : null,
        publishedAt: Number.isNaN(parsed) ? null : parsed,
        image: imageFromNode(node),
      };
    })
    .filter((item) => {
      if (!item.title || !isHttpUrl(item.link) || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, MAX_ITEMS);
}

type FetchTextResult = { ok: true; text: string } | { ok: false; status?: number; error?: string };

function abortSignal(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(new DOMException("Aborted", "AbortError"));
    else signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
      once: true,
    });
  });
}

export async function fetchFeed(
  url: string,
  fallbackLabel: string,
  signal?: AbortSignal,
): Promise<NewsItem[]> {
  const request = chrome.runtime.sendMessage({
    type: "lux:fetch-text",
    url,
  }) as Promise<FetchTextResult | undefined>;
  const result = await (signal ? Promise.race([request, abortSignal(signal)]) : request);
  if (!result?.ok) {
    throw new Error(result?.status ? `News request failed (${result.status})` : "News request failed");
  }
  return parseFeed(result.text, fallbackLabel);
}

const httpUrlSchema = z.string().refine(isHttpUrl);

const itemSchema = z.object({
  id: z.string(),
  title: z.string(),
  link: httpUrlSchema,
  source: z.string(),
  sourceUrl: httpUrlSchema.nullable().default(null),
  publishedAt: z.number().nullable(),
  image: httpUrlSchema.nullable().default(null),
});

export function parseCachedNews(raw: unknown): NewsItem[] | null {
  const result = z.array(itemSchema).safeParse(raw);
  return result.success ? result.data : null;
}
