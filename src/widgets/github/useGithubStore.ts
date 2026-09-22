import { z } from "zod";
import { looksLikeLegacySingleton, tolerantArray, tolerantRecord } from "@/lib/persist";
import { createPersistedStore } from "@/lib/storage";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import { openBehaviorSchema, type OpenBehavior } from "@/lib/open-url";
import {
  GITHUB_VIEWS,
  INBOX_FILTERS,
  type GithubView,
  type InboxFilter,
} from "@/widgets/github/types";

export const GITHUB_SYNC_COOLDOWN_MS = 10_000;

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
  lastSeenReleaseAt?: string;
  setView: (instanceId: string, view: GithubView) => void;
  setShowPrivate: (instanceId: string, showPrivate: boolean) => void;
  setShowDrafts: (instanceId: string, showDrafts: boolean) => void;
  setInboxFilter: (instanceId: string, inboxFilter: InboxFilter) => void;
  toggleRepoCollapsed: (instanceId: string, repo: string) => void;
  setOpenBehavior: (instanceId: string, openBehavior: OpenBehavior) => void;
  removeInstance: (instanceId: string) => void;
  markReleasesSeen: (publishedAt: string | undefined) => void;
};

export const DEFAULT_DATA: GithubData = {
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
  lastSeenReleaseAt: z.string().optional().catch(undefined),
});

const LEGACY_KEYS = ["view", "showPrivate", "openBehavior", "contributions"] as const;

function update(
  state: GithubStoreState,
  instanceId: string,
  fn: (data: GithubData) => GithubData,
): Pick<GithubStoreState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, fn) };
}

export const useGithubStore = createPersistedStore<GithubStoreState>()(
  (set, get) => ({
    byInstance: {},
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
    markReleasesSeen: (publishedAt) => {
      if (!publishedAt) return;
      const seen = get().lastSeenReleaseAt;
      if (!seen || Date.parse(publishedAt) > Date.parse(seen)) {
        set({ lastSeenReleaseAt: publishedAt });
      }
    },
  }),
  {
    name: "widget:github",
    version: 2,
    partialize: (state) => ({
      byInstance: state.byInstance,
      lastSeenReleaseAt: state.lastSeenReleaseAt,
    }),
    migrate: (persisted, version) => {
      if (version >= 2) return persisted;
      if (!looksLikeLegacySingleton(persisted, LEGACY_KEYS)) return { byInstance: {} };
      const legacy = configSchema.safeParse(persisted);
      return { byInstance: legacy.success ? { github: legacy.data } : {} };
    },
    schema: persistedSchema,
    build: (parsed, current) => ({
      ...current,
      byInstance: parsed.byInstance,
      lastSeenReleaseAt: parsed.lastSeenReleaseAt,
    }),
  },
);

export const useGithub = createInstanceSelector(useGithubStore, DEFAULT_DATA);
