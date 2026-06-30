import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import type { OpenBehavior } from "@/lib/open-url";
import { invalidatePolledResource } from "@/widgets/core/usePolledResource";
import { syncCooldownRemainingMs } from "@/widgets/core/syncCooldown";
import { GITHUB_VIEWS, type ContributionsData, type GithubView } from "@/widgets/github/types";

export const GITHUB_SYNC_COOLDOWN_MS = 10_000;

type SyncResult = { ok: boolean; remainingMs: number };

type GithubData = {
  view: GithubView;
  showPrivate: boolean;
  openBehavior: OpenBehavior;
};

type GithubStoreState = {
  byInstance: Record<string, GithubData>;
  contributions?: ContributionsData;
  syncNonce: number;
  syncing: boolean;
  lastSyncAt?: number;
  setView: (instanceId: string, view: GithubView) => void;
  setShowPrivate: (instanceId: string, showPrivate: boolean) => void;
  setOpenBehavior: (instanceId: string, openBehavior: OpenBehavior) => void;
  removeInstance: (instanceId: string) => void;
  setContributions: (contributions: ContributionsData) => void;
  setSyncing: (syncing: boolean) => void;
  requestSync: () => SyncResult;
};

const DEFAULT_DATA: GithubData = {
  view: "contributions",
  showPrivate: true,
  openBehavior: "currentTab",
};

const contributionDaySchema = z.object({
  date: z.string(),
  count: z.number(),
  level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

const repoActivitySchema = z.object({
  repo: z.string(),
  url: z.string(),
  isPrivate: z.boolean(),
  commits: z.number(),
  prs: z.number(),
  issues: z.number(),
  reviews: z.number(),
  total: z.number(),
});

const contributionsDataSchema = z.object({
  weeks: z.array(z.array(contributionDaySchema)),
  total: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  login: z.string().optional(),
  totals: z
    .object({
      commits: z.number(),
      prs: z.number(),
      issues: z.number(),
      reviews: z.number(),
    })
    .optional(),
  activity: z.array(repoActivitySchema).optional(),
});

const configSchema = z.object({
  view: z.enum(GITHUB_VIEWS).default("contributions"),
  showPrivate: z.boolean().default(true),
  openBehavior: z.enum(["currentTab", "newTab"]).default("currentTab"),
});

const legacySchema = configSchema.extend({ contributions: contributionsDataSchema.optional() });

const persistedSchema = z.object({
  byInstance: z.record(z.string(), configSchema),
  contributions: contributionsDataSchema.optional(),
});

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
      contributions: undefined,
      syncNonce: 0,
      syncing: false,
      lastSyncAt: undefined,
      setView: (instanceId, view) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, view }))),
      setShowPrivate: (instanceId, showPrivate) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, showPrivate }))),
      setOpenBehavior: (instanceId, openBehavior) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, openBehavior }))),
      removeInstance: (instanceId) =>
        set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) })),
      setContributions: (contributions) => set({ contributions }),
      setSyncing: (syncing) => set({ syncing }),
      requestSync: () => {
        const remainingMs = syncCooldownRemainingMs(get().lastSyncAt, GITHUB_SYNC_COOLDOWN_MS);
        if (remainingMs > 0) {
          return { ok: false, remainingMs };
        }
        invalidatePolledResource("github:contributions");
        invalidatePolledResource("github:inbox");
        set({ syncNonce: get().syncNonce + 1, lastSyncAt: Date.now() });
        return { ok: true, remainingMs: 0 };
      },
    }),
    {
      name: "widget:github",
      storage: gatedStorage,
      version: 2,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({
        byInstance: state.byInstance,
        contributions: state.contributions,
      }),
      migrate: (persisted, version) => {
        if (version >= 2) return persisted;
        const legacy = legacySchema.safeParse(persisted);
        if (!legacy.success) return { byInstance: {} };
        return {
          byInstance: {
            github: {
              view: legacy.data.view,
              showPrivate: legacy.data.showPrivate,
              openBehavior: legacy.data.openBehavior,
            },
          },
          contributions: legacy.data.contributions,
        };
      },
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        const byInstance: Record<string, GithubData> = {};
        for (const [id, data] of Object.entries(parsed.data.byInstance)) {
          byInstance[id] = {
            view: data.view,
            showPrivate: data.showPrivate,
            openBehavior: data.openBehavior,
          };
        }
        return { ...current, byInstance, contributions: parsed.data.contributions };
      },
    },
  ),
);

registerInstanceCleanup((instanceId) => useGithubStore.getState().removeInstance(instanceId));

export const useGithub = createInstanceSelector(useGithubStore, DEFAULT_DATA);
