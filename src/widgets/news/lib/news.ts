import { z } from "zod";
import {
  NEWS_SOURCES,
  type NewsItem,
  type NewsRegion,
  type NewsSource,
  type NewsTab,
  type NewsTopic,
} from "@/widgets/news/types";

const MAX_ITEMS = 30;

const GOOGLE_LOCALES: Record<NewsRegion, string> = {
  us: "hl=en-US&gl=US&ceid=US:en",
  uk: "hl=en-GB&gl=GB&ceid=GB:en",
  au: "hl=en-AU&gl=AU&ceid=AU:en",
  international: "hl=en-US&gl=US&ceid=US:en",
};

const BBC_TOP = "https://feeds.bbci.co.uk/news/rss.xml";

type TopicKey = Exclude<NewsTopic, "top">;
type SectionMap = Partial<Record<TopicKey, (region: NewsRegion) => string>>;

type SourceMeta = {
  tab: string;
  label: string;
  feed: string | Record<NewsRegion, string>;
  section?: SectionMap;
};

function googleFeed(region: NewsRegion): string {
  return `https://news.google.com/rss?${GOOGLE_LOCALES[region]}`;
}

function googleTopicFeed(section: string, region: NewsRegion): string {
  return `https://news.google.com/rss/headlines/section/topic/${section}?${GOOGLE_LOCALES[region]}`;
}

function guardianEdition(edition: string): string {
  return `https://www.theguardian.com/${edition}/rss`;
}

function bbcSection(path: string): string {
  return `https://feeds.bbci.co.uk/${path}/rss.xml`;
}

function nytSection(section: string): string {
  return `https://rss.nytimes.com/services/xml/rss/nyt/${section}.xml`;
}

function nprSection(id: string): string {
  return `https://feeds.npr.org/${id}/rss.xml`;
}

const SOURCES: Record<NewsSource, SourceMeta> = {
  bbc: {
    tab: "BBC",
    label: "BBC News",
    feed: {
      us: BBC_TOP,
      uk: "https://feeds.bbci.co.uk/news/uk/rss.xml",
      au: BBC_TOP,
      international: BBC_TOP,
    },
    section: {
      world: () => bbcSection("news/world"),
      business: () => bbcSection("news/business"),
      technology: () => bbcSection("news/technology"),
      science: () => bbcSection("news/science_and_environment"),
      sports: () => bbcSection("sport"),
    },
  },
  google: {
    tab: "Google",
    label: "Google News",
    feed: {
      us: googleFeed("us"),
      uk: googleFeed("uk"),
      au: googleFeed("au"),
      international: googleFeed("international"),
    },
    section: {
      world: (region) => googleTopicFeed("WORLD", region),
      business: (region) => googleTopicFeed("BUSINESS", region),
      technology: (region) => googleTopicFeed("TECHNOLOGY", region),
      science: (region) => googleTopicFeed("SCIENCE", region),
      sports: (region) => googleTopicFeed("SPORTS", region),
    },
  },
  guardian: {
    tab: "Guardian",
    label: "The Guardian",
    feed: {
      us: guardianEdition("us"),
      uk: guardianEdition("uk"),
      au: guardianEdition("au"),
      international: guardianEdition("international"),
    },
    section: {
      world: () => guardianEdition("world"),
      business: () => guardianEdition("business"),
      technology: () => guardianEdition("technology"),
      science: () => guardianEdition("science"),
      sports: () => guardianEdition("sport"),
    },
  },
  npr: {
    tab: "NPR",
    label: "NPR",
    feed: nprSection("1001"),
    section: {
      world: () => nprSection("1004"),
      business: () => nprSection("1006"),
      technology: () => nprSection("1019"),
      science: () => nprSection("1007"),
      sports: () => nprSection("1055"),
    },
  },
  nyt: {
    tab: "NYT",
    label: "The New York Times",
    feed: nytSection("HomePage"),
    section: {
      world: () => nytSection("World"),
      business: () => nytSection("Business"),
      technology: () => nytSection("Technology"),
      science: () => nytSection("Science"),
    },
  },
  yahoo: {
    tab: "Yahoo",
    label: "Yahoo News",
    feed: "https://news.yahoo.com/rss/",
  },
};

export function sourceTab(source: NewsSource): string {
  return SOURCES[source].tab;
}

export function feedUrl(source: NewsSource, region: NewsRegion, topic: NewsTopic = "top"): string {
  const meta = SOURCES[source];
  if (topic !== "top") {
    const resolver = meta.section?.[topic];
    if (resolver) return resolver(region);
  }
  const feed = meta.feed;
  return typeof feed === "string" ? feed : feed[region];
}

export function searchUrl(query: string, region: NewsRegion): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&${GOOGLE_LOCALES[region]}`;
}

export function resolveNewsTab(activeSource: NewsTab, sources: NewsSource[]): NewsTab {
  if (sources.length > 1) {
    return activeSource === "all" || !sources.includes(activeSource) ? "all" : activeSource;
  }
  return sources[0] ?? "google";
}

const THUMBNAIL_SOURCES = new Set<NewsSource>(["nyt", "bbc", "guardian", "yahoo"]);

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

const MAX_DEK_LENGTH = 280;

function cleanDek(raw: string | null | undefined, title: string): string | null {
  if (!raw) return null;
  const text = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
  if (!text || normalizeTitle(text) === normalizeTitle(title)) return null;
  return text.length > MAX_DEK_LENGTH ? `${text.slice(0, MAX_DEK_LENGTH - 1).trimEnd()}…` : text;
}

const PREFERRED_IMAGE_WIDTH = 400;

function imageFromNode(node: Element): string | null {
  const candidates = [
    ...node.getElementsByTagName("media:content"),
    ...node.getElementsByTagName("media:thumbnail"),
    ...node.getElementsByTagName("enclosure"),
  ]
    .map((media) => ({
      url: media.getAttribute("url")?.trim() ?? "",
      width: Number(media.getAttribute("width")) || null,
    }))
    .filter((candidate) => isHttpUrl(candidate.url));
  if (candidates.length === 0) return null;

  const sized = candidates.filter(
    (candidate): candidate is { url: string; width: number } => candidate.width !== null,
  );
  const adequate = sized
    .filter((candidate) => candidate.width >= PREFERRED_IMAGE_WIDTH)
    .sort((a, b) => a.width - b.width)[0];
  const largest = sized.sort((a, b) => b.width - a.width)[0];
  return (adequate ?? largest ?? candidates[0])?.url ?? null;
}

export function parseFeed(
  xml: string,
  fallbackSource: string,
  sourceKey: NewsSource | null = null,
): NewsItem[] {
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
      const cleanTitle = stripSourceSuffix(title, source);
      const dekRaw =
        sourceKey === "google" ? null : node.querySelector("description, summary")?.textContent;
      return {
        id: guid || link || title,
        title: cleanTitle,
        link,
        source,
        sourceKey,
        sourceUrl: sourceUrlAttr && isHttpUrl(sourceUrlAttr) ? sourceUrlAttr : null,
        publishedAt: Number.isNaN(parsed) ? null : parsed,
        image: imageFromNode(node),
        dek: cleanDek(dekRaw, cleanTitle),
        alsoIn: [],
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
    else
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
        once: true,
      });
  });
}

async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  const request = chrome.runtime.sendMessage({
    type: "lux:fetch-text",
    url,
  }) as Promise<FetchTextResult | undefined>;
  const result = await (signal ? Promise.race([request, abortSignal(signal)]) : request);
  if (!result?.ok) {
    throw new Error(
      result?.status ? `News request failed (${result.status})` : "News request failed",
    );
  }
  return result.text;
}

export async function fetchFeed(
  source: NewsSource,
  region: NewsRegion,
  topic: NewsTopic,
  signal?: AbortSignal,
): Promise<NewsItem[]> {
  const xml = await fetchText(feedUrl(source, region, topic), signal);
  return parseFeed(xml, SOURCES[source].label, source);
}

export async function fetchSearch(
  query: string,
  region: NewsRegion,
  signal?: AbortSignal,
): Promise<NewsItem[]> {
  const xml = await fetchText(searchUrl(query, region), signal);
  return parseFeed(xml, SOURCES.google.label, "google");
}

const MAX_MERGED_ITEMS = 50;

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

type Cluster = { rep: NewsItem; sources: string[] };

export function mergeFeeds(feeds: NewsItem[][]): NewsItem[] {
  const byTitle = new Map<string, Cluster>();
  for (const item of feeds.flat()) {
    const key = normalizeTitle(item.title);
    const cluster = byTitle.get(key);
    if (!cluster) {
      byTitle.set(key, { rep: item, sources: [item.source] });
      continue;
    }
    if (!cluster.sources.includes(item.source)) cluster.sources.push(item.source);
    if (!cluster.rep.image && item.image) cluster.rep = item;
  }
  return [...byTitle.values()]
    .map(({ rep, sources }) => ({ ...rep, alsoIn: sources.filter((name) => name !== rep.source) }))
    .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
    .slice(0, MAX_MERGED_ITEMS);
}

export async function fetchMergedFeeds(
  sources: NewsSource[],
  region: NewsRegion,
  topic: NewsTopic,
  signal?: AbortSignal,
): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    sources.map((source) => fetchFeed(source, region, topic, signal)),
  );
  const loaded = results.filter(
    (result): result is PromiseFulfilledResult<NewsItem[]> => result.status === "fulfilled",
  );
  if (loaded.length === 0) {
    const first = results[0];
    throw first?.status === "rejected" && first.reason instanceof Error
      ? first.reason
      : new Error("News request failed");
  }
  return mergeFeeds(loaded.map((result) => result.value));
}

const httpUrlSchema = z.string().refine(isHttpUrl);

const itemSchema = z.object({
  id: z.string(),
  title: z.string(),
  link: httpUrlSchema,
  source: z.string(),
  sourceKey: z.enum(NEWS_SOURCES).nullable().default(null).catch(null),
  sourceUrl: httpUrlSchema.nullable().default(null),
  publishedAt: z.number().nullable(),
  image: httpUrlSchema.nullable().default(null),
  dek: z.string().nullable().default(null).catch(null),
  alsoIn: z.array(z.string()).default([]).catch([]),
});

export function parseCachedNews(raw: unknown): NewsItem[] | null {
  const result = z.array(itemSchema).safeParse(raw);
  return result.success ? result.data : null;
}
