import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import {
  DEFAULT_REGION,
  TREND_REGION_CODES,
  type TrendRegion,
} from "@/widgets/news/lib/trend-regions";
import type { RankMap } from "@/widgets/news/lib/trend-movement";
import { createGatedChromeStorage } from "@/lib/storage";
import { keepPersisted, mergePersisted, tolerantArray, tolerantRecord } from "@/lib/persist";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import { openBehaviorSchema, type OpenBehavior } from "@/lib/open-url";
import {
  NEWS_LAYOUTS,
  NEWS_REGIONS,
  NEWS_SOURCES,
  NEWS_TABS,
  NEWS_VIEWS,
  NEWS_TOPICS,
  MAX_BOOKMARKS,
  type Bookmark,
  type NewsItem,
  type NewsLayout,
  type NewsRegion,
  type NewsSource,
  type NewsTab,
  type NewsView,
  type NewsTopic,
} from "@/widgets/news/types";

export const NEWS_SYNC_COOLDOWN_MS = 60_000;
export const MAX_ENABLED_SOURCES = 5;

const DEFAULT_ENABLED_SOURCES: NewsSource[] = ["bbc", "guardian", "nyt", "yahoo"];
const MAX_READ_TITLES = 200;
const MAX_SEEN_TITLES = 400;
export const MAX_TERMS = 20;

function appendCapped(existing: string[], added: string[], cap: number): string[] {
  const merged = [...existing, ...added.filter((id) => !existing.includes(id))];
  return merged.length > cap ? merged.slice(merged.length - cap) : merged;
}

export type NewsData = {
  view: NewsView;
  trendRegion: TrendRegion;
  activeSource: NewsTab;
  region: NewsRegion;
  topic: NewsTopic;
  layout: NewsLayout;
  googleQuery: string;
  enabledSources: NewsSource[];
  openBehavior: OpenBehavior;
  loadImages: boolean;
  sortByLatest: boolean;
  readTitles: string[];
  seenTitles: string[];
  mutedTerms: string[];
  highlightTerms: string[];
  bookmarks: Bookmark[];
};

type TrendSnapshot = { takenAt: number; ranks: RankMap; previous: RankMap };

type NewsState = {
  byInstance: Record<string, NewsData>;
  trendSnapshots: Record<string, TrendSnapshot>;
  setView: (instanceId: string, view: NewsView) => void;
  setTrendRegion: (instanceId: string, region: TrendRegion) => void;
  rememberTrendSnapshot: (region: string, ranks: RankMap, takenAt: number) => void;
  setActiveSource: (instanceId: string, source: NewsTab) => void;
  setRegion: (instanceId: string, region: NewsRegion) => void;
  setTopic: (instanceId: string, topic: NewsTopic) => void;
  setLayout: (instanceId: string, layout: NewsLayout) => void;
  setGoogleQuery: (instanceId: string, query: string) => void;
  setEnabledSources: (instanceId: string, sources: NewsSource[]) => void;
  setOpenBehavior: (instanceId: string, behavior: OpenBehavior) => void;
  setLoadImages: (instanceId: string, loadImages: boolean) => void;
  setSortByLatest: (instanceId: string, sortByLatest: boolean) => void;
  markRead: (instanceId: string, title: string) => void;
  markSeen: (instanceId: string, titles: string[]) => void;
  addMutedTerm: (instanceId: string, term: string) => AddTermResult;
  removeMutedTerm: (instanceId: string, term: string) => void;
  addHighlightTerm: (instanceId: string, term: string) => AddTermResult;
  removeHighlightTerm: (instanceId: string, term: string) => void;
  toggleBookmark: (instanceId: string, item: NewsItem) => boolean;
  removeInstance: (instanceId: string) => void;
};

export const DEFAULT_DATA: NewsData = {
  view: "news",
  trendRegion: DEFAULT_REGION,
  activeSource: "all",
  region: "us",
  topic: "top",
  layout: "list",
  googleQuery: "",
  enabledSources: DEFAULT_ENABLED_SOURCES,
  openBehavior: "currentTab",
  loadImages: true,
  sortByLatest: true,
  readTitles: [],
  seenTitles: [],
  mutedTerms: [],
  highlightTerms: [],
  bookmarks: [],
};

function isNewsSource(value: string): value is NewsSource {
  return (NEWS_SOURCES as readonly string[]).includes(value);
}

const relatedSchema = z.object({ source: z.string(), link: z.string() });

const bookmarkSchema = z.object({
  item: z.object({
    id: z.string(),
    title: z.string(),
    link: z.string(),
    source: z.string(),
    sourceKey: z.enum(NEWS_SOURCES).nullable().catch(null),
    sourceUrl: z.string().nullable().catch(null),
    publishedAt: z.number().nullable().catch(null),
    image: z.string().nullable().catch(null),
    dek: z.string().nullable().catch(null),
    related: tolerantArray(relatedSchema),
  }),
  savedAt: z.number().catch(0),
});

const rankSchema = tolerantRecord(z.number());

const snapshotSchema = z.object({
  takenAt: z.number().catch(0),
  ranks: rankSchema,
  previous: rankSchema,
});

const dataSchema = z.object({
  view: z.enum(NEWS_VIEWS).catch("news"),
  trendRegion: z.enum(TREND_REGION_CODES).catch(DEFAULT_REGION),
  activeSource: z.enum(NEWS_TABS).catch("all"),
  region: z.enum(NEWS_REGIONS).catch("us"),
  topic: z.enum(NEWS_TOPICS).catch("top"),
  layout: z.enum(NEWS_LAYOUTS).catch("list"),
  googleQuery: z.string().catch(""),
  enabledSources: tolerantArray(z.string()).transform((sources) => {
    const valid = sources.filter(isNewsSource);
    return valid.length > 0 ? valid : DEFAULT_ENABLED_SOURCES;
  }),
  openBehavior: openBehaviorSchema,
  loadImages: z.boolean().catch(true),
  sortByLatest: z.boolean().catch(true),
  readTitles: tolerantArray(z.string()),
  seenTitles: tolerantArray(z.string()),
  mutedTerms: tolerantArray(z.string()),
  highlightTerms: tolerantArray(z.string()),
  bookmarks: tolerantArray(bookmarkSchema),
});

const persistedSchema = z.object({
  byInstance: tolerantRecord(dataSchema),
  trendSnapshots: tolerantRecord(snapshotSchema),
});

const gatedStorage = createGatedChromeStorage();

function update(
  state: NewsState,
  instanceId: string,
  fn: (data: NewsData) => NewsData,
): Pick<NewsState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, fn) };
}

type TermField = "mutedTerms" | "highlightTerms";

export type AddTermResult = "added" | "empty" | "duplicate" | "full";

function termOutcome(terms: string[], trimmed: string): AddTermResult {
  if (!trimmed) return "empty";
  if (terms.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) return "duplicate";
  if (terms.length >= MAX_TERMS) return "full";
  return "added";
}

function removeTerm(field: TermField, term: string) {
  return (data: NewsData): NewsData => ({
    ...data,
    [field]: data[field].filter((entry) => entry !== term),
  });
}

const MAX_REMEMBERED_REGIONS = 6;

function trimSnapshots(snapshots: Record<string, TrendSnapshot>): Record<string, TrendSnapshot> {
  const entries = Object.entries(snapshots).sort((a, b) => b[1].takenAt - a[1].takenAt);
  return Object.fromEntries(entries.slice(0, MAX_REMEMBERED_REGIONS));
}

export const useNewsStore = create<NewsState>()(
  persist(
    (set, get) => {
      const addTerm = (instanceId: string, field: TermField, term: string): AddTermResult => {
        const trimmed = term.trim();
        const outcome = termOutcome(get().byInstance[instanceId]?.[field] ?? [], trimmed);
        if (outcome !== "added") return outcome;
        set((state) =>
          update(state, instanceId, (data) => ({ ...data, [field]: [...data[field], trimmed] })),
        );
        return outcome;
      };

      return {
        byInstance: {},
        trendSnapshots: {},
        setView: (instanceId, view) =>
          set((state) => update(state, instanceId, (data) => ({ ...data, view }))),
        setTrendRegion: (instanceId, trendRegion) =>
          set((state) => update(state, instanceId, (data) => ({ ...data, trendRegion }))),
        rememberTrendSnapshot: (region, ranks, takenAt) =>
          set((state) => {
            const current = state.trendSnapshots[region];
            if (current && takenAt <= current.takenAt) return state;
            const next = {
              ...state.trendSnapshots,
              [region]: { takenAt, ranks, previous: current?.ranks ?? {} },
            };
            return { trendSnapshots: trimSnapshots(next) };
          }),
        setActiveSource: (instanceId, activeSource) =>
          set((state) => update(state, instanceId, (data) => ({ ...data, activeSource }))),
        setRegion: (instanceId, region) =>
          set((state) => update(state, instanceId, (data) => ({ ...data, region }))),
        setTopic: (instanceId, topic) =>
          set((state) => update(state, instanceId, (data) => ({ ...data, topic }))),
        setLayout: (instanceId, layout) =>
          set((state) => update(state, instanceId, (data) => ({ ...data, layout }))),
        setGoogleQuery: (instanceId, googleQuery) =>
          set((state) => update(state, instanceId, (data) => ({ ...data, googleQuery }))),
        setEnabledSources: (instanceId, sources) =>
          set((state) =>
            update(state, instanceId, (data) =>
              sources.length > 0 && sources.length <= MAX_ENABLED_SOURCES
                ? { ...data, enabledSources: sources }
                : data,
            ),
          ),
        setOpenBehavior: (instanceId, openBehavior) =>
          set((state) => update(state, instanceId, (data) => ({ ...data, openBehavior }))),
        setLoadImages: (instanceId, loadImages) =>
          set((state) => update(state, instanceId, (data) => ({ ...data, loadImages }))),
        setSortByLatest: (instanceId, sortByLatest) =>
          set((state) => update(state, instanceId, (data) => ({ ...data, sortByLatest }))),
        markRead: (instanceId, title) => {
          if (get().byInstance[instanceId]?.readTitles.includes(title)) return;
          set((state) =>
            update(state, instanceId, (data) => ({
              ...data,
              readTitles: appendCapped(data.readTitles, [title], MAX_READ_TITLES),
            })),
          );
        },
        markSeen: (instanceId, titles) => {
          const seenTitles = get().byInstance[instanceId]?.seenTitles;
          if (seenTitles && titles.every((title) => seenTitles.includes(title))) return;
          set((state) =>
            update(state, instanceId, (data) => ({
              ...data,
              seenTitles: appendCapped(data.seenTitles, titles, MAX_SEEN_TITLES),
            })),
          );
        },
        addMutedTerm: (instanceId, term) => addTerm(instanceId, "mutedTerms", term),
        removeMutedTerm: (instanceId, term) =>
          set((state) => update(state, instanceId, removeTerm("mutedTerms", term))),
        addHighlightTerm: (instanceId, term) => addTerm(instanceId, "highlightTerms", term),
        removeHighlightTerm: (instanceId, term) =>
          set((state) => update(state, instanceId, removeTerm("highlightTerms", term))),
        toggleBookmark: (instanceId, item) => {
          const bookmarks = get().byInstance[instanceId]?.bookmarks ?? [];
          const saved = bookmarks.some((entry) => entry.item.link === item.link);
          if (!saved && bookmarks.length >= MAX_BOOKMARKS) return false;
          set((state) =>
            update(state, instanceId, (data) => ({
              ...data,
              bookmarks: saved
                ? data.bookmarks.filter((entry) => entry.item.link !== item.link)
                : [{ item, savedAt: Date.now() }, ...data.bookmarks],
            })),
          );
          return true;
        },
        removeInstance: (instanceId) =>
          set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) })),
      };
    },
    {
      name: "widget:news",
      storage: gatedStorage,
      version: 1,
      migrate: keepPersisted,
      onRehydrateStorage: () => () => gatedStorage.open(useNewsStore),
      partialize: (state) => ({
        byInstance: state.byInstance,
        trendSnapshots: state.trendSnapshots,
      }),
      merge: (persisted, current) =>
        mergePersisted("widget:news", persistedSchema, persisted, current, (parsed) => ({
          ...current,
          byInstance: parsed.byInstance,
          trendSnapshots: trimSnapshots(parsed.trendSnapshots),
        })),
    },
  ),
);

export const useNews = createInstanceSelector(useNewsStore, DEFAULT_DATA);
