import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import {
  looksLikeLegacySingleton,
  mergePersisted,
  tolerantArray,
  tolerantRecord,
} from "@/lib/persist";
import { createGatedChromeStorage } from "@/lib/storage";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import { openBehaviorSchema, type OpenBehavior } from "@/lib/open-url";
import { stalePolledResource } from "@/widgets/core/usePolledResource";
import {
  bumpSyncNonce,
  createSyncSlice,
  isSyncCoolingDown,
  type SyncSlice,
} from "@/widgets/core/syncSlice";
import {
  CONTRIBUTIONS_CACHE_KEY,
  GITHUB_VIEWS,
  INBOX_CACHE_KEY,
  INBOX_FILTERS,
  RELEASES_CACHE_KEY,
  type GithubView,
  type InboxFilter,
} from "@/widgets/github/types";

export const GITHUB_SYNC_COOLDOWN_MS = 10_000;
export const GITHUB_SYNC_KEY = "github";

const CACHE_KEYS = [CONTRIBUTIONS_CACHE_KEY, INBOX_CACHE_KEY, RELEASES_CACHE_KEY] as const;

export type GithubData = {
  view: GithubView;
  showPrivate: boolean;
  showDrafts: boolean;
  inboxFilter: InboxFilter;
  collapsedRepos: string[];
  openBehavior: OpenBehavior;
};

type GithubStoreState = SyncSlice & {
  byInstance: Record<string, GithubData>;
  login?: string;
  lastSeenReleaseAt?: string;
  setView: (instanceId: string, view: GithubView) => void;
  setShowPrivate: (instanceId: string, showPrivate: boolean) => void;
  setShowDrafts: (instanceId: string, showDrafts: boolean) => void;
  setInboxFilter: (instanceId: string, inboxFilter: InboxFilter) => void;
  toggleRepoCollapsed: (instanceId: string, repo: string) => void;
  setOpenBehavior: (instanceId: string, openBehavior: OpenBehavior) => void;
  removeInstance: (instanceId: string) => void;
  setLogin: (login: string | undefined) => void;
  markReleasesSeen: (publishedAt: string | undefined) => void;
  requestSync: () => void;
};

const DEFAULT_DATA: GithubData = {
  view: "contributions",
  showPrivate: true,
  showDrafts: true,
  inboxFilter: "all",
  collapsedRepos: [],
  openBehavior: "currentTab",
};

const configSchema = z.object({
  view: z.enum(GITHUB_VIEWS).catch("contributions"),
  showPrivate: z.boolean().catch(true),
  showDrafts: z.boolean().catch(true),
  inboxFilter: z.enum(INBOX_FILTERS).catch("all"),
  collapsedRepos: tolerantArray(z.string()),
  openBehavior: openBehaviorSchema,
});

const persistedSchema = z.object({
  byInstance: tolerantRecord(configSchema),
  login: z.string().optional().catch(undefined),
  lastSeenReleaseAt: z.string().optional().catch(undefined),
});

const LEGACY_KEYS = ["view", "showPrivate", "openBehavior", "contributions"] as const;

const gatedStorage = createGatedChromeStorage();

function update(
  state: GithubStoreState,
  instanceId: string,
  fn: (data: GithubData) => GithubData,
): Pick<GithubStoreState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, fn) };
}

export const useGithubStore = create<GithubStoreState>()(
  persist(
    (set, get) => ({
      ...createSyncSlice(set),
      byInstance: {},
      login: undefined,
      lastSeenReleaseAt: undefined,
      setView: (instanceId, view) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, view }))),
      setShowPrivate: (instanceId, showPrivate) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, showPrivate }))),
      setShowDrafts: (instanceId, showDrafts) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, showDrafts }))),
      setInboxFilter: (instanceId, inboxFilter) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, inboxFilter }))),
      toggleRepoCollapsed: (instanceId, repo) =>
        set((state) =>
          update(state, instanceId, (data) => ({
            ...data,
            collapsedRepos: data.collapsedRepos.includes(repo)
              ? data.collapsedRepos.filter((entry) => entry !== repo)
              : [...data.collapsedRepos, repo],
          })),
        ),
      setOpenBehavior: (instanceId, openBehavior) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, openBehavior }))),
      removeInstance: (instanceId) =>
        set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) })),
      setLogin: (login) => {
        if (login !== get().login) set({ login });
      },
      markReleasesSeen: (publishedAt) => {
        if (!publishedAt) return;
        const seen = get().lastSeenReleaseAt;
        if (!seen || Date.parse(publishedAt) > Date.parse(seen)) {
          set({ lastSeenReleaseAt: publishedAt });
        }
      },
      requestSync: () => {
        if (isSyncCoolingDown(get(), GITHUB_SYNC_KEY, GITHUB_SYNC_COOLDOWN_MS)) return;
        for (const cacheKey of CACHE_KEYS) stalePolledResource(cacheKey);
        set((state) => bumpSyncNonce(state, GITHUB_SYNC_KEY));
      },
    }),
    {
      name: "widget:github",
      storage: gatedStorage,
      version: 2,
      onRehydrateStorage: () => () => gatedStorage.open(useGithubStore),
      partialize: (state) => ({
        byInstance: state.byInstance,
        login: state.login,
        lastSeenReleaseAt: state.lastSeenReleaseAt,
      }),
      migrate: (persisted, version) => {
        if (version >= 2) return persisted;
        if (!looksLikeLegacySingleton(persisted, LEGACY_KEYS)) return { byInstance: {} };
        const legacy = configSchema.safeParse(persisted);
        return { byInstance: legacy.success ? { github: legacy.data } : {} };
      },
      merge: (persisted, current) =>
        mergePersisted("widget:github", persistedSchema, persisted, current, (parsed) => ({
          ...current,
          byInstance: parsed.byInstance,
          login: parsed.login,
          lastSeenReleaseAt: parsed.lastSeenReleaseAt,
        })),
    },
  ),
);

export const useGithub = createInstanceSelector(useGithubStore, DEFAULT_DATA);
