import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import type { OpenBehavior } from "@/lib/open-url";
import { NEWS_SOURCES, NEWS_TOPICS, type NewsSource, type NewsTopic } from "@/widgets/news/types";

export const NEWS_SYNC_COOLDOWN_MS = 60_000;

type NewsData = {
  activeSource: NewsSource;
  topic: NewsTopic;
  googleQuery: string;
  enabledSources: NewsSource[];
  openBehavior: OpenBehavior;
  sortByLatest: boolean;
};

type NewsState = {
  byInstance: Record<string, NewsData>;
  setActiveSource: (instanceId: string, source: NewsSource) => void;
  setTopic: (instanceId: string, topic: NewsTopic) => void;
  setGoogleQuery: (instanceId: string, query: string) => void;
  setEnabledSources: (instanceId: string, sources: NewsSource[]) => void;
  setOpenBehavior: (instanceId: string, behavior: OpenBehavior) => void;
  setSortByLatest: (instanceId: string, sortByLatest: boolean) => void;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_DATA: NewsData = {
  activeSource: "google",
  topic: "top",
  googleQuery: "",
  enabledSources: [...NEWS_SOURCES],
  openBehavior: "currentTab",
  sortByLatest: false,
};

const dataSchema = z.object({
  activeSource: z.enum(NEWS_SOURCES).default("google"),
  topic: z.enum(NEWS_TOPICS).default("top"),
  googleQuery: z.string().default(""),
  enabledSources: z
    .array(z.enum(NEWS_SOURCES))
    .default([...NEWS_SOURCES])
    .transform((sources) => (sources.length > 0 ? sources : [...NEWS_SOURCES])),
  openBehavior: z.enum(["currentTab", "newTab"]).default("currentTab"),
  sortByLatest: z.boolean().default(false),
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

export const useNewsStore = create<NewsState>()(
  persist(
    (set) => ({
      byInstance: {},
      setActiveSource: (instanceId, activeSource) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, activeSource }))),
      setTopic: (instanceId, topic) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, topic }))),
      setGoogleQuery: (instanceId, googleQuery) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, googleQuery }))),
      setEnabledSources: (instanceId, sources) =>
        set((state) =>
          update(state, instanceId, (data) =>
            sources.length > 0 ? { ...data, enabledSources: sources } : data,
          ),
        ),
      setOpenBehavior: (instanceId, openBehavior) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, openBehavior }))),
      setSortByLatest: (instanceId, sortByLatest) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, sortByLatest }))),
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
