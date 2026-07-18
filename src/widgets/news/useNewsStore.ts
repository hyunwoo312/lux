import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import type { OpenBehavior } from "@/lib/open-url";
import {
  NEWS_LAYOUTS,
  NEWS_REGIONS,
  NEWS_SOURCES,
  NEWS_TABS,
  NEWS_TOPICS,
  type NewsLayout,
  type NewsRegion,
  type NewsSource,
  type NewsTab,
  type NewsTopic,
} from "@/widgets/news/types";

export const NEWS_SYNC_COOLDOWN_MS = 60_000;
export const MAX_ENABLED_SOURCES = 5;

const DEFAULT_ENABLED_SOURCES: NewsSource[] = ["bbc", "guardian", "nyt", "yahoo"];
const MAX_READ_TITLES = 200;
const MAX_SEEN_TITLES = 400;
const MAX_TERMS = 20;

function appendCapped(existing: string[], added: string[], cap: number): string[] {
  const merged = [...existing, ...added.filter((id) => !existing.includes(id))];
  return merged.length > cap ? merged.slice(merged.length - cap) : merged;
}

type NewsData = {
  activeSource: NewsTab;
  region: NewsRegion;
  topic: NewsTopic;
  layout: NewsLayout;
  googleQuery: string;
  enabledSources: NewsSource[];
  openBehavior: OpenBehavior;
  sortByLatest: boolean;
  readTitles: string[];
  seenTitles: string[];
  mutedTerms: string[];
  highlightTerms: string[];
};

type NewsState = {
  byInstance: Record<string, NewsData>;
  setActiveSource: (instanceId: string, source: NewsTab) => void;
  setRegion: (instanceId: string, region: NewsRegion) => void;
  setTopic: (instanceId: string, topic: NewsTopic) => void;
  setLayout: (instanceId: string, layout: NewsLayout) => void;
  setGoogleQuery: (instanceId: string, query: string) => void;
  setEnabledSources: (instanceId: string, sources: NewsSource[]) => void;
  setOpenBehavior: (instanceId: string, behavior: OpenBehavior) => void;
  setSortByLatest: (instanceId: string, sortByLatest: boolean) => void;
  markRead: (instanceId: string, title: string) => void;
  markSeen: (instanceId: string, titles: string[]) => void;
  addMutedTerm: (instanceId: string, term: string) => void;
  removeMutedTerm: (instanceId: string, term: string) => void;
  addHighlightTerm: (instanceId: string, term: string) => void;
  removeHighlightTerm: (instanceId: string, term: string) => void;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_DATA: NewsData = {
  activeSource: "all",
  region: "us",
  topic: "top",
  layout: "list",
  googleQuery: "",
  enabledSources: DEFAULT_ENABLED_SOURCES,
  openBehavior: "currentTab",
  sortByLatest: true,
  readTitles: [],
  seenTitles: [],
  mutedTerms: [],
  highlightTerms: [],
};

function isNewsSource(value: string): value is NewsSource {
  return (NEWS_SOURCES as readonly string[]).includes(value);
}

const dataSchema = z.object({
  activeSource: z.enum(NEWS_TABS).default("all").catch("all"),
  region: z.enum(NEWS_REGIONS).default("us"),
  topic: z.enum(NEWS_TOPICS).default("top").catch("top"),
  layout: z.enum(NEWS_LAYOUTS).default("list"),
  googleQuery: z.string().default(""),
  enabledSources: z
    .array(z.string())
    .default(DEFAULT_ENABLED_SOURCES)
    .transform((sources) => {
      const valid = sources.filter(isNewsSource);
      return valid.length > 0 ? valid : DEFAULT_ENABLED_SOURCES;
    }),
  openBehavior: z.enum(["currentTab", "newTab"]).default("currentTab"),
  sortByLatest: z.boolean().default(true),
  readTitles: z.array(z.string()).default([]),
  seenTitles: z.array(z.string()).default([]),
  mutedTerms: z.array(z.string()).default([]),
  highlightTerms: z.array(z.string()).default([]),
});

const persistedSchema = z.object({
  byInstance: z.record(z.string(), dataSchema),
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

function addTerm(field: TermField, term: string) {
  return (data: NewsData): NewsData => {
    const trimmed = term.trim();
    const exists = data[field].some((entry) => entry.toLowerCase() === trimmed.toLowerCase());
    if (!trimmed || exists || data[field].length >= MAX_TERMS) return data;
    return { ...data, [field]: [...data[field], trimmed] };
  };
}

function removeTerm(field: TermField, term: string) {
  return (data: NewsData): NewsData => ({
    ...data,
    [field]: data[field].filter((entry) => entry !== term),
  });
}

export const useNewsStore = create<NewsState>()(
  persist(
    (set, get) => ({
      byInstance: {},
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
      addMutedTerm: (instanceId, term) =>
        set((state) => update(state, instanceId, addTerm("mutedTerms", term))),
      removeMutedTerm: (instanceId, term) =>
        set((state) => update(state, instanceId, removeTerm("mutedTerms", term))),
      addHighlightTerm: (instanceId, term) =>
        set((state) => update(state, instanceId, addTerm("highlightTerms", term))),
      removeHighlightTerm: (instanceId, term) =>
        set((state) => update(state, instanceId, removeTerm("highlightTerms", term))),
      removeInstance: (instanceId) =>
        set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) })),
    }),
    {
      name: "widget:news",
      storage: gatedStorage,
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({ byInstance: state.byInstance }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return { ...current, byInstance: parsed.data.byInstance };
      },
    },
  ),
);

registerInstanceCleanup((instanceId) => useNewsStore.getState().removeInstance(instanceId));

export const useNews = createInstanceSelector(useNewsStore, DEFAULT_DATA);
