import { z } from "zod";
import { looksLikeLegacySingleton, tolerantRecord } from "@/lib/persist";
import { createPersistedStore } from "@/lib/storage";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import { openBehaviorSchema, type OpenBehavior } from "@/lib/open-url";
import { stalePolledResource } from "@/widgets/core/usePolledResource";
import { stalePagedResource } from "@/widgets/core/usePagedResource";
import {
  bumpSyncNonce,
  createSyncSlice,
  isSyncCoolingDown,
  type SyncSlice,
} from "@/widgets/core/syncSlice";
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
export const ANILIST_SYNC_KEY = "anilist";

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

type AnilistStoreState = SyncSlice & {
  byInstance: Record<string, AnilistData>;
  lastSeenActivityAt?: string;
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
  setLastSeenActivity: (createdAt: string) => void;
  requestSync: (instanceId: string, viewerId: number) => void;
};

export const DEFAULT_DATA: AnilistData = {
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
  openBehavior: openBehaviorSchema,
  discoverFeed: z.enum(DISCOVER_FEEDS).catch("trending"),
  discoverType: z.enum(DISCOVER_TYPES).catch("anime"),
});

const legacySchema = configSchema.extend({
  lastSeenActivityAt: z.number().optional(),
});

const persistedSchema = z.preprocess(
  normalisePersisted,
  z.object({
    byInstance: tolerantRecord(configSchema),
    lastSeenActivityAt: z
      .union([
        z.iso.datetime(),
        z.number().transform((seconds) => new Date(seconds * 1000).toISOString()),
      ])
      .optional()
      .catch(undefined),
  }),
);

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

function update(
  state: AnilistStoreState,
  instanceId: string,
  fn: (data: AnilistData) => AnilistData,
): Pick<AnilistStoreState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, fn) };
}

export const useAnilistStore = createPersistedStore<AnilistStoreState>()(
  (set, get) => ({
    ...createSyncSlice(set),
    byInstance: {},
    lastSeenActivityAt: undefined,
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
        lastSeenActivityAt:
          state.lastSeenActivityAt !== undefined && state.lastSeenActivityAt > createdAt
            ? state.lastSeenActivityAt
            : createdAt,
      })),
    requestSync: (instanceId, viewerId) => {
      if (isSyncCoolingDown(get(), ANILIST_SYNC_KEY, ANILIST_SYNC_COOLDOWN_MS)) return;
      const { titleLanguage, discoverFeed, discoverType } =
        get().byInstance[instanceId] ?? DEFAULT_DATA;
      stalePolledResource(anilistKeys.discover(titleLanguage, discoverFeed, discoverType));
      stalePolledResource(anilistKeys.library(viewerId, titleLanguage));
      stalePolledResource(anilistKeys.unread(viewerId));
      stalePagedResource(anilistKeys.activity(viewerId, titleLanguage));
      stalePagedResource(anilistKeys.inbox(viewerId, titleLanguage));
      set((state) => bumpSyncNonce(state, ANILIST_SYNC_KEY));
    },
  }),
  {
    name: "widget:anilist",
    version: 5,
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
      if (!looksLikeLegacySingleton(persisted, LEGACY_KEYS)) return { byInstance: {} };
      const legacy = legacySchema.safeParse(migrateLegacyFields(persisted));
      if (!legacy.success) return { byInstance: {} };
      const { lastSeenActivityAt, ...config } = legacy.data;
      return { byInstance: { anilist: config }, lastSeenActivityAt };
    },
    schema: persistedSchema,
    build: (parsed, current) => ({
      ...current,
      byInstance: parsed.byInstance,
      lastSeenActivityAt: parsed.lastSeenActivityAt,
    }),
  },
);

export const useAnilist = createInstanceSelector(useAnilistStore, DEFAULT_DATA);
