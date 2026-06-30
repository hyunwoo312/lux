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
import {
  ANILIST_TABS,
  CURRENT_SORTS,
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
  titleLanguage: TitleLanguage;
  openBehavior: OpenBehavior;
};

type AnilistStoreState = {
  byInstance: Record<string, AnilistData>;
  lastSeenActivityAt?: number;
  lastSeenInboxAt?: number;
  syncNonce: number;
  syncing: boolean;
  lastSyncAt?: number;
  setActiveTab: (instanceId: string, activeTab: AnilistTab) => void;
  setMediaFilter: (instanceId: string, mediaFilter: MediaFilter) => void;
  setCurrentSort: (instanceId: string, currentSort: CurrentSort) => void;
  setTitleLanguage: (instanceId: string, titleLanguage: TitleLanguage) => void;
  setOpenBehavior: (instanceId: string, openBehavior: OpenBehavior) => void;
  removeInstance: (instanceId: string) => void;
  setLastSeenActivity: (createdAt: number) => void;
  setLastSeenInbox: (createdAt: number) => void;
  setSyncing: (syncing: boolean) => void;
  requestSync: (titleLanguage: TitleLanguage) => SyncResult;
};

const DEFAULT_DATA: AnilistData = {
  activeTab: "activity",
  mediaFilter: "both",
  currentSort: "waiting",
  titleLanguage: "english",
  openBehavior: "currentTab",
};

const configSchema = z.object({
  activeTab: z.enum(ANILIST_TABS).default("activity"),
  mediaFilter: z.enum(MEDIA_FILTERS).default("both"),
  currentSort: z.enum(CURRENT_SORTS).default("waiting"),
  titleLanguage: z.enum(TITLE_LANGUAGES).default("english"),
  openBehavior: z.enum(["currentTab", "newTab"]).default("currentTab"),
});

const legacySchema = configSchema.extend({
  lastSeenActivityAt: z.number().optional(),
  lastSeenInboxAt: z.number().optional(),
});

const persistedSchema = z.object({
  byInstance: z.record(z.string(), configSchema),
  lastSeenActivityAt: z.number().optional(),
  lastSeenInboxAt: z.number().optional(),
});

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
  if (raw.activeTab === "library") raw.activeTab = "current";
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
      lastSeenInboxAt: undefined,
      syncNonce: 0,
      syncing: false,
      lastSyncAt: undefined,
      setActiveTab: (instanceId, activeTab) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, activeTab }))),
      setMediaFilter: (instanceId, mediaFilter) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, mediaFilter }))),
      setCurrentSort: (instanceId, currentSort) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, currentSort }))),
      setTitleLanguage: (instanceId, titleLanguage) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, titleLanguage }))),
      setOpenBehavior: (instanceId, openBehavior) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, openBehavior }))),
      removeInstance: (instanceId) =>
        set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) })),
      setLastSeenActivity: (createdAt) =>
        set((state) => ({
          lastSeenActivityAt: Math.max(state.lastSeenActivityAt ?? 0, createdAt),
        })),
      setLastSeenInbox: (createdAt) =>
        set((state) => ({
          lastSeenInboxAt: Math.max(state.lastSeenInboxAt ?? 0, createdAt),
        })),
      setSyncing: (syncing) => set({ syncing }),
      requestSync: (titleLanguage) => {
        const remainingMs = syncCooldownRemainingMs(get().lastSyncAt, ANILIST_SYNC_COOLDOWN_MS);
        if (remainingMs > 0) {
          return { ok: false, remainingMs };
        }
        invalidatePolledResource(`anilist:current:${titleLanguage}`);
        invalidatePolledResource("anilist:unread");
        invalidatePagedResource(`anilist:activity:${titleLanguage}`);
        invalidatePagedResource(`anilist:inbox:${titleLanguage}`);
        set({ syncNonce: get().syncNonce + 1, lastSyncAt: Date.now() });
        return { ok: true, remainingMs: 0 };
      },
    }),
    {
      name: "widget:anilist",
      storage: gatedStorage,
      version: 4,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({
        byInstance: state.byInstance,
        lastSeenActivityAt: state.lastSeenActivityAt,
        lastSeenInboxAt: state.lastSeenInboxAt,
      }),
      migrate: (persisted, version) => {
        if (version >= 4) return persisted;
        const legacy = legacySchema.safeParse(migrateLegacyFields(persisted));
        if (!legacy.success) return { byInstance: {} };
        const { lastSeenActivityAt, lastSeenInboxAt, ...config } = legacy.data;
        return { byInstance: { anilist: config }, lastSeenActivityAt, lastSeenInboxAt };
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
            titleLanguage: data.titleLanguage,
            openBehavior: data.openBehavior,
          };
        }
        return {
          ...current,
          byInstance,
          lastSeenActivityAt: parsed.data.lastSeenActivityAt,
          lastSeenInboxAt: parsed.data.lastSeenInboxAt,
        };
      },
    },
  ),
);

registerInstanceCleanup((instanceId) => useAnilistStore.getState().removeInstance(instanceId));

export const useAnilist = createInstanceSelector(useAnilistStore, DEFAULT_DATA);
