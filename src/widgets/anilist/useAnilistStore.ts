import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
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

type AnilistStoreState = {
  activeTab: AnilistTab;
  mediaFilter: MediaFilter;
  currentSort: CurrentSort;
  titleLanguage: TitleLanguage;
  openBehavior: OpenBehavior;
  lastSeenActivityAt?: number;
  lastSeenInboxAt?: number;
  syncNonce: number;
  syncing: boolean;
  lastSyncAt?: number;
  setActiveTab: (activeTab: AnilistTab) => void;
  setMediaFilter: (mediaFilter: MediaFilter) => void;
  setCurrentSort: (currentSort: CurrentSort) => void;
  setTitleLanguage: (titleLanguage: TitleLanguage) => void;
  setOpenBehavior: (openBehavior: OpenBehavior) => void;
  setLastSeenActivity: (createdAt: number) => void;
  setLastSeenInbox: (createdAt: number) => void;
  setSyncing: (syncing: boolean) => void;
  requestSync: () => SyncResult;
};

const persistedSchema = z.object({
  activeTab: z.enum(ANILIST_TABS).default("activity"),
  mediaFilter: z.enum(MEDIA_FILTERS).default("both"),
  currentSort: z.enum(CURRENT_SORTS).default("waiting"),
  titleLanguage: z.enum(TITLE_LANGUAGES).default("english"),
  openBehavior: z.enum(["currentTab", "newTab"]).default("currentTab"),
  lastSeenActivityAt: z.number().optional(),
  lastSeenInboxAt: z.number().optional(),
});

function migratePersisted(persisted: unknown): unknown {
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

export const useAnilistStore = create<AnilistStoreState>()(
  persist(
    (set, get) => ({
      activeTab: "activity",
      mediaFilter: "both",
      currentSort: "waiting",
      titleLanguage: "english",
      openBehavior: "currentTab",
      lastSeenActivityAt: undefined,
      lastSeenInboxAt: undefined,
      syncNonce: 0,
      syncing: false,
      lastSyncAt: undefined,
      setActiveTab: (activeTab) => set({ activeTab }),
      setMediaFilter: (mediaFilter) => set({ mediaFilter }),
      setCurrentSort: (currentSort) => set({ currentSort }),
      setTitleLanguage: (titleLanguage) => set({ titleLanguage }),
      setOpenBehavior: (openBehavior) => set({ openBehavior }),
      setLastSeenActivity: (createdAt) =>
        set((state) => ({
          lastSeenActivityAt: Math.max(state.lastSeenActivityAt ?? 0, createdAt),
        })),
      setLastSeenInbox: (createdAt) =>
        set((state) => ({
          lastSeenInboxAt: Math.max(state.lastSeenInboxAt ?? 0, createdAt),
        })),
      setSyncing: (syncing) => set({ syncing }),
      requestSync: () => {
        const remainingMs = syncCooldownRemainingMs(get().lastSyncAt, ANILIST_SYNC_COOLDOWN_MS);
        if (remainingMs > 0) {
          return { ok: false, remainingMs };
        }
        const lang = get().titleLanguage;
        invalidatePolledResource(`anilist:current:${lang}`);
        invalidatePolledResource("anilist:unread");
        invalidatePagedResource(`anilist:activity:${lang}`);
        invalidatePagedResource(`anilist:inbox:${lang}`);
        set({ syncNonce: get().syncNonce + 1, lastSyncAt: Date.now() });
        return { ok: true, remainingMs: 0 };
      },
    }),
    {
      name: "widget:anilist",
      storage: gatedStorage,
      version: 3,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({
        activeTab: state.activeTab,
        mediaFilter: state.mediaFilter,
        currentSort: state.currentSort,
        titleLanguage: state.titleLanguage,
        openBehavior: state.openBehavior,
        lastSeenActivityAt: state.lastSeenActivityAt,
        lastSeenInboxAt: state.lastSeenInboxAt,
      }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(migratePersisted(persisted));
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);
