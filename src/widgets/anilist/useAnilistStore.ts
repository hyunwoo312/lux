import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { mergePersisted, tolerantRecord } from "@/lib/persist";
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
  FEED_SOURCES,
  VIEW_MODES,
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
  type FeedSource,
  type ViewMode,
  type MediaFilter,
  type TitleLanguage,
} from "@/widgets/anilist/types";

export const ANILIST_SYNC_COOLDOWN_MS = 10_000;

type SyncResult = { ok: boolean; remainingMs: number };

type AnilistData = {
  activeTab: AnilistTab;
  feedSource: FeedSource;
  viewMode: ViewMode;
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
  setFeedSource: (instanceId: string, feedSource: FeedSource) => void;
  setViewMode: (instanceId: string, viewMode: ViewMode) => void;
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
  requestSync: (instanceId: string, viewerId: number) => SyncResult;
};

const DEFAULT_DATA: AnilistData = {
  activeTab: "feed",
  feedSource: "following",
  viewMode: "grid",
  mediaFilter: "both",
  currentSort: "score",
  listFilter: "all",
  titleLanguage: "english",
  openBehavior: "currentTab",
  discoverFeed: "trending",
  discoverType: "anime",
};

const configSchema = z.object({
  activeTab: z.enum(ANILIST_TABS).catch("feed"),
  feedSource: z.enum(FEED_SOURCES).catch("following"),
  viewMode: z.enum(VIEW_MODES).catch("grid"),
  mediaFilter: z.enum(MEDIA_FILTERS).catch("both"),
  currentSort: z.enum(CURRENT_SORTS).catch("score"),
  listFilter: z.enum(LIST_FILTERS).catch("all"),
  titleLanguage: z.enum(TITLE_LANGUAGES).catch("english"),
  openBehavior: z.enum(["currentTab", "newTab"]).catch("currentTab"),
  discoverFeed: z.enum(DISCOVER_FEEDS).catch("trending"),
  discoverType: z.enum(DISCOVER_TYPES).catch("anime"),
});

const legacySchema = configSchema.extend({
  lastSeenActivityAt: z.number().optional(),
});

const persistedSchema = z.object({
  byInstance: tolerantRecord(configSchema),
  lastSeenActivityAt: z.number().optional().catch(undefined),
});

const LEGACY_TAB_REMAP: Record<string, { activeTab: AnilistTab; feedSource?: FeedSource }> = {
  activity: { activeTab: "feed", feedSource: "following" },
  inbox: { activeTab: "feed", feedSource: "notifications" },
  current: { activeTab: "library" },
  planning: { activeTab: "library" },
};

function normaliseConfig(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  const remap = typeof data.activeTab === "string" ? LEGACY_TAB_REMAP[data.activeTab] : undefined;
  if (!remap) return data;
  return { ...data, ...remap, feedSource: data.feedSource ?? remap.feedSource };
}

function normalisePersisted(persisted: unknown): unknown {
  if (!persisted || typeof persisted !== "object") return persisted;
  const raw = persisted as { byInstance?: unknown };
  if (!raw.byInstance || typeof raw.byInstance !== "object") return raw;
  const byInstance = Object.fromEntries(
    Object.entries(raw.byInstance as Record<string, unknown>).map(([instanceId, value]) => [
      instanceId,
      normaliseConfig(value),
    ]),
  );
  return { ...raw, byInstance };
}

const LEGACY_KEYS = [
  "activeTab",
  "defaultTab",
  "view",
  "librarySort",
  "currentSort",
  "titleLanguage",
  "mediaFilter",
  "openBehavior",
] as const;

function looksLikeLegacySingleton(persisted: unknown): boolean {
  if (!persisted || typeof persisted !== "object") return false;
  return LEGACY_KEYS.some((key) => key in persisted);
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
  if (raw.currentSort === undefined && typeof raw.librarySort === "string") {
    raw.currentSort = raw.librarySort;
  }
  return normaliseConfig(raw);
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
      setFeedSource: (instanceId, feedSource) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, feedSource }))),
      setViewMode: (instanceId, viewMode) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, viewMode }))),
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
      requestSync: (instanceId, viewerId) => {
        const remainingMs = syncCooldownRemainingMs(get().lastSyncAt, ANILIST_SYNC_COOLDOWN_MS);
        if (remainingMs > 0) {
          return { ok: false, remainingMs };
        }
        const { titleLanguage, discoverFeed, discoverType } =
          get().byInstance[instanceId] ?? DEFAULT_DATA;
        invalidatePolledResource(anilistKeys.discover(titleLanguage, discoverFeed, discoverType));
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
      onRehydrateStorage: () => () => gatedStorage.open(useAnilistStore),
      partialize: (state) => ({
        byInstance: state.byInstance,
        lastSeenActivityAt: state.lastSeenActivityAt,
      }),
      migrate: (persisted) => {
        const normalised = normalisePersisted(persisted);
        if (
          normalised &&
          typeof normalised === "object" &&
          "byInstance" in normalised &&
          typeof (normalised as { byInstance?: unknown }).byInstance === "object"
        ) {
          return normalised;
        }
        if (!looksLikeLegacySingleton(persisted)) return { byInstance: {} };
        const legacy = legacySchema.safeParse(migrateLegacyFields(persisted));
        if (!legacy.success) return { byInstance: {} };
        const { lastSeenActivityAt, ...config } = legacy.data;
        return { byInstance: { anilist: config }, lastSeenActivityAt };
      },
      merge: (persisted, current) =>
        mergePersisted(
          "widget:anilist",
          persistedSchema,
          normalisePersisted(persisted),
          current,
          (parsed) => ({
            ...current,
            byInstance: parsed.byInstance,
            lastSeenActivityAt: parsed.lastSeenActivityAt,
          }),
        ),
    },
  ),
);

registerInstanceCleanup((instanceId) => useAnilistStore.getState().removeInstance(instanceId));

export const useAnilist = createInstanceSelector(useAnilistStore, DEFAULT_DATA);
