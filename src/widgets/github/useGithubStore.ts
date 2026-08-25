import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { mergePersisted, tolerantArray, tolerantRecord } from "@/lib/persist";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import type { OpenBehavior } from "@/lib/open-url";
import { invalidatePolledResource } from "@/widgets/core/usePolledResource";
import { syncCooldownRemainingMs } from "@/widgets/core/syncCooldown";
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

const CACHE_KEYS = [CONTRIBUTIONS_CACHE_KEY, INBOX_CACHE_KEY, RELEASES_CACHE_KEY] as const;

type SyncResult = { ok: boolean; remainingMs: number };

export type GithubData = {
  view: GithubView;
  showPrivate: boolean;
  showDrafts: boolean;
  inboxFilter: InboxFilter;
  collapsedRepos: string[];
  openBehavior: OpenBehavior;
};

type GithubStoreState = {
  byInstance: Record<string, GithubData>;
  login?: string;
  lastSeenReleaseAt?: string;
  syncNonce: number;
  syncing: boolean;
  lastSyncAt?: number;
  dataSyncedAt?: number;
  setView: (instanceId: string, view: GithubView) => void;
  setShowPrivate: (instanceId: string, showPrivate: boolean) => void;
  setShowDrafts: (instanceId: string, showDrafts: boolean) => void;
  setInboxFilter: (instanceId: string, inboxFilter: InboxFilter) => void;
  toggleRepoCollapsed: (instanceId: string, repo: string) => void;
  setOpenBehavior: (instanceId: string, openBehavior: OpenBehavior) => void;
  removeInstance: (instanceId: string) => void;
  setLogin: (login: string | undefined) => void;
  markReleasesSeen: (publishedAt: string | undefined) => void;
  setSyncing: (syncing: boolean) => void;
  reportSynced: (at: number) => void;
  requestSync: () => SyncResult;
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
  openBehavior: z.enum(["currentTab", "newTab"]).catch("currentTab"),
});

const persistedSchema = z.object({
  byInstance: tolerantRecord(configSchema),
  login: z.string().optional().catch(undefined),
  lastSeenReleaseAt: z.string().optional().catch(undefined),
});

const LEGACY_KEYS = ["view", "showPrivate", "openBehavior", "contributions"] as const;

function looksLikeLegacySingleton(persisted: unknown): boolean {
  if (!persisted || typeof persisted !== "object") return false;
  return LEGACY_KEYS.some((key) => key in persisted);
}

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
      byInstance: {},
      login: undefined,
      lastSeenReleaseAt: undefined,
      syncNonce: 0,
      syncing: false,
      lastSyncAt: undefined,
      dataSyncedAt: undefined,
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
      setSyncing: (syncing) => set({ syncing }),
      reportSynced: (at) => {
        if (at > (get().dataSyncedAt ?? 0)) set({ dataSyncedAt: at });
      },
      requestSync: () => {
        const remainingMs = syncCooldownRemainingMs(get().lastSyncAt, GITHUB_SYNC_COOLDOWN_MS);
        if (remainingMs > 0) {
          return { ok: false, remainingMs };
        }
        for (const key of CACHE_KEYS) invalidatePolledResource(key);
        set({ syncNonce: get().syncNonce + 1, lastSyncAt: Date.now() });
        return { ok: true, remainingMs: 0 };
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
        if (!looksLikeLegacySingleton(persisted)) return { byInstance: {} };
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

registerInstanceCleanup((instanceId) => useGithubStore.getState().removeInstance(instanceId));

export const useGithub = createInstanceSelector(useGithubStore, DEFAULT_DATA);
