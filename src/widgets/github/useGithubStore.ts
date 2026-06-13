import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import type { OpenBehavior } from "@/lib/open-url";
import { invalidatePolledResource } from "@/widgets/core/usePolledResource";
import { syncCooldownRemainingMs } from "@/widgets/core/syncCooldown";
import { GITHUB_VIEWS, type ContributionsData, type GithubView } from "@/widgets/github/types";

export const GITHUB_SYNC_COOLDOWN_MS = 10_000;

type SyncResult = { ok: boolean; remainingMs: number };

type GithubStoreState = {
  view: GithubView;
  showPrivate: boolean;
  openBehavior: OpenBehavior;
  contributions?: ContributionsData;
  syncNonce: number;
  syncing: boolean;
  lastSyncAt?: number;
  setView: (view: GithubView) => void;
  setShowPrivate: (showPrivate: boolean) => void;
  setOpenBehavior: (openBehavior: OpenBehavior) => void;
  setContributions: (contributions: ContributionsData) => void;
  setSyncing: (syncing: boolean) => void;
  requestSync: () => SyncResult;
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

const persistedSchema = z.object({
  view: z.enum(GITHUB_VIEWS).default("contributions"),
  showPrivate: z.boolean().default(true),
  openBehavior: z.enum(["currentTab", "newTab"]).default("currentTab"),
  contributions: contributionsDataSchema.optional(),
});

const gatedStorage = createGatedChromeStorage();

export const useGithubStore = create<GithubStoreState>()(
  persist(
    (set, get) => ({
      view: "contributions",
      showPrivate: true,
      openBehavior: "currentTab",
      contributions: undefined,
      syncNonce: 0,
      syncing: false,
      lastSyncAt: undefined,
      setView: (view) => set({ view }),
      setShowPrivate: (showPrivate) => set({ showPrivate }),
      setOpenBehavior: (openBehavior) => set({ openBehavior }),
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
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({
        view: state.view,
        showPrivate: state.showPrivate,
        openBehavior: state.openBehavior,
        contributions: state.contributions,
      }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);
