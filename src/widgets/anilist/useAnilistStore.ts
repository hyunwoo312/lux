import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import type { OpenBehavior } from "@/lib/open-url";
import { invalidatePolledResource } from "@/widgets/core/usePolledResource";
import { invalidatePagedResource } from "@/widgets/core/usePagedResource";
import { syncCooldownRemainingMs } from "@/widgets/core/syncCooldown";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import {
  ANILIST_TABS,
  CURRENT_SORTS,
  LIST_FILTERS,
  type ListFilter,
  DISCOVER_FEEDS,
  DISCOVER_TYPES,
  type DiscoverFeed,
  type DiscoverType,
  MEDIA_FILTERS,
  TITLE_LANGUAGES,
  type AnilistTab,
  type CurrentSort,
  type MediaFilter,
  type TitleLanguage,
} from "@/widgets/anilist/types";

export const ANILIST_SYNC_COOLDOWN_MS = 10_000;

type SyncResult = { ok: boolean; remainingMs: number };

type AnilistData = {
  activeTab: AnilistTab;
  mediaFilter: MediaFilter;
  currentSort: CurrentSort;
  listFilter: ListFilter;
  titleLanguage: TitleLanguage;
  openBehavior: OpenBehavior;
  discoverFeed: DiscoverFeed;
  discoverType: DiscoverType;
};

type AnilistStoreState = {
  byInstance: Record<string, AnilistData>;
  lastSeenActivityAt?: number;
  syncNonce: number;
  syncing: boolean;
  lastSyncAt?: number;
  dataSyncedAt?: number;
  setActiveTab: (instanceId: string, activeTab: AnilistTab) => void;
  setMediaFilter: (instanceId: string, mediaFilter: MediaFilter) => void;
  setCurrentSort: (instanceId: string, currentSort: CurrentSort) => void;
  setListFilter: (instanceId: string, listFilter: ListFilter) => void;
  setTitleLanguage: (instanceId: string, titleLanguage: TitleLanguage) => void;
  setOpenBehavior: (instanceId: string, openBehavior: OpenBehavior) => void;
  setDiscoverFeed: (instanceId: string, discoverFeed: DiscoverFeed) => void;
  setDiscoverType: (instanceId: string, discoverType: DiscoverType) => void;
  removeInstance: (instanceId: string) => void;
  setLastSeenActivity: (createdAt: number) => void;
  setSyncing: (syncing: boolean) => void;
  reportSynced: (at: number) => void;
  requestSync: (titleLanguage: TitleLanguage, viewerId: number) => SyncResult;
};

const DEFAULT_DATA: AnilistData = {
  activeTab: "activity",
  mediaFilter: "both",
  currentSort: "score",
  listFilter: "all",
  titleLanguage: "english",
  openBehavior: "currentTab",
  discoverFeed: "trending",
  discoverType: "anime",
};

const configSchema = z.object({
  activeTab: z.enum(ANILIST_TABS).default("activity"),
  mediaFilter: z.enum(MEDIA_FILTERS).default("both"),
  currentSort: z.enum(CURRENT_SORTS).default("score"),
  listFilter: z.enum(LIST_FILTERS).default("all"),
  titleLanguage: z.enum(TITLE_LANGUAGES).default("english"),
  openBehavior: z.enum(["currentTab", "newTab"]).default("currentTab"),
  discoverFeed: z.enum(DISCOVER_FEEDS).default("trending"),
  discoverType: z.enum(DISCOVER_TYPES).default("anime"),
});

const legacySchema = configSchema.extend({
  lastSeenActivityAt: z.number().optional(),
});

const persistedSchema = z.object({
  byInstance: z.record(z.string(), configSchema),
  lastSeenActivityAt: z.number().optional(),
});

function mergeLibraryTab(persisted: unknown): unknown {
  if (!persisted || typeof persisted !== "object") return persisted;
  const raw = persisted as { byInstance?: Record<string, { activeTab?: unknown }> };
  if (!raw.byInstance) return persisted;
  const entries = Object.entries(raw.byInstance);
  if (!entries.some(([, data]) => data?.activeTab === "current" || data?.activeTab === "planning")) {
    return persisted;
  }
  const byInstance = Object.fromEntries(
    entries.map(([id, data]) => [
      id,
      data?.activeTab === "current" || data?.activeTab === "planning"
        ? { ...data, activeTab: "library" }
        : data,
    ]),
  );
  return { ...raw, byInstance };
}

function migrateLegacyFields(persisted: unknown): unknown {
  if (!persisted || typeof persisted !== "object") return persisted;
  const raw = { ...(persisted as Record<string, unknown>) };
  if (raw.activeTab === undefined) {
    if (typeof raw.defaultTab === "string") {
      raw.activeTab = raw.defaultTab;
    } else if (typeof raw.view === "string") {
      raw.activeTab = raw.view === "inbox" ? "inbox" : "current";
    }
  }
  if (raw.activeTab === "current" || raw.activeTab === "planning") raw.activeTab = "library";
  if (raw.currentSort === undefined && typeof raw.librarySort === "string") {
    raw.currentSort = raw.librarySort;
  }
  return raw;
}

const gatedStorage = createGatedChromeStorage();

function update(
  state: AnilistStoreState,
  instanceId: string,
  fn: (data: AnilistData) => AnilistData,
): Pick<AnilistStoreState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, fn) };
}

export const useAnilistStore = create<AnilistStoreState>()(
  persist(
    (set, get) => ({
      byInstance: {},
      lastSeenActivityAt: undefined,
      syncNonce: 0,
      syncing: false,
      lastSyncAt: undefined,
      dataSyncedAt: undefined,
      setActiveTab: (instanceId, activeTab) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, activeTab }))),
      setMediaFilter: (instanceId, mediaFilter) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, mediaFilter }))),
      setListFilter: (instanceId, listFilter) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, listFilter }))),
      setCurrentSort: (instanceId, currentSort) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, currentSort }))),
      setTitleLanguage: (instanceId, titleLanguage) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, titleLanguage }))),
      setDiscoverFeed: (instanceId, discoverFeed) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, discoverFeed }))),
      setDiscoverType: (instanceId, discoverType) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, discoverType }))),
      setOpenBehavior: (instanceId, openBehavior) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, openBehavior }))),
      removeInstance: (instanceId) =>
        set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) })),
      setLastSeenActivity: (createdAt) =>
        set((state) => ({
          lastSeenActivityAt: Math.max(state.lastSeenActivityAt ?? 0, createdAt),
        })),
      setSyncing: (syncing) => set({ syncing }),
      reportSynced: (at) => {
        if (at > (get().dataSyncedAt ?? 0)) set({ dataSyncedAt: at });
      },
      requestSync: (titleLanguage, viewerId) => {
        const remainingMs = syncCooldownRemainingMs(get().lastSyncAt, ANILIST_SYNC_COOLDOWN_MS);
        if (remainingMs > 0) {
          return { ok: false, remainingMs };
        }
        invalidatePolledResource(anilistKeys.library(viewerId, titleLanguage));
        invalidatePolledResource(anilistKeys.unread(viewerId));
        invalidatePagedResource(anilistKeys.activity(viewerId, titleLanguage));
        invalidatePagedResource(anilistKeys.inbox(viewerId, titleLanguage));
        set({ syncNonce: get().syncNonce + 1, lastSyncAt: Date.now() });
        return { ok: true, remainingMs: 0 };
      },
    }),
    {
      name: "widget:anilist",
      storage: gatedStorage,
      version: 5,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({
        byInstance: state.byInstance,
        lastSeenActivityAt: state.lastSeenActivityAt,
      }),
      migrate: (persisted, version) => {
        if (version >= 5) return mergeLibraryTab(persisted);
        const legacy = legacySchema.safeParse(migrateLegacyFields(persisted));
        if (!legacy.success) return { byInstance: {} };
        const { lastSeenActivityAt, ...config } = legacy.data;
        return { byInstance: { anilist: config }, lastSeenActivityAt };
      },
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        const byInstance: Record<string, AnilistData> = {};
        for (const [id, data] of Object.entries(parsed.data.byInstance)) {
          byInstance[id] = {
            activeTab: data.activeTab,
            mediaFilter: data.mediaFilter,
            currentSort: data.currentSort,
            listFilter: data.listFilter,
            discoverFeed: data.discoverFeed,
            discoverType: data.discoverType,
            titleLanguage: data.titleLanguage,
            openBehavior: data.openBehavior,
          };
        }
        return {
          ...current,
          byInstance,
          lastSeenActivityAt: parsed.data.lastSeenActivityAt,
        };
      },
    },
  ),
);

registerInstanceCleanup((instanceId) => useAnilistStore.getState().removeInstance(instanceId));

export const useAnilist = createInstanceSelector(useAnilistStore, DEFAULT_DATA);
