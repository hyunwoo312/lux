import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { httpUrlSchema, openBehaviorSchema } from "@/lib/open-url";
import {
  looksLikeLegacySingleton,
  mergePersisted,
  tolerantArray,
  tolerantRecord,
} from "@/lib/persist";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import { hostnameOf, normalizeUrl } from "@/widgets/quick-access/lib/url";
import { showToast } from "@/stores/useToastStore";
import type {
  LinkResult,
  OpenBehavior,
  QuickAccessTab,
  QuickAccessView,
  QuickLink,
  RemovedLink,
} from "@/widgets/quick-access/types";

const DEFAULT_LINKS: QuickLink[] = [
  { id: "google", title: "Google", url: "https://www.google.com/" },
  { id: "chatgpt", title: "ChatGPT", url: "https://chatgpt.com/" },
  { id: "claude", title: "Claude", url: "https://claude.ai/" },
  { id: "github", title: "GitHub", url: "https://github.com/" },
];

type QuickAccessData = {
  links: QuickLink[];
  activeTab: QuickAccessTab;
  openBehavior: OpenBehavior;
  view: QuickAccessView;
  bookmarkPath: string[];
  showTopSites: boolean;
  showOpenTabs: boolean;
  showRecentlyClosed: boolean;
};

type QuickAccessState = {
  byInstance: Record<string, QuickAccessData>;
  removed: Record<string, RemovedLink | undefined>;
  addLink: (instanceId: string, title: string, url: string) => LinkResult;
  editLink: (instanceId: string, id: string, title: string, url: string) => LinkResult;
  removeLink: (instanceId: string, id: string) => void;
  undoRemove: (instanceId: string) => void;
  dismissRemoved: (instanceId: string, linkId: string) => void;
  togglePin: (instanceId: string, title: string, url: string) => void;
  setLinks: (instanceId: string, links: QuickLink[]) => void;
  setActiveTab: (instanceId: string, tab: QuickAccessTab) => void;
  setOpenBehavior: (instanceId: string, openBehavior: OpenBehavior) => void;
  setView: (instanceId: string, view: QuickAccessView) => void;
  setBookmarkPath: (instanceId: string, bookmarkPath: string[]) => void;
  setShowTopSites: (instanceId: string, showTopSites: boolean) => void;
  setShowOpenTabs: (instanceId: string, showOpenTabs: boolean) => void;
  setShowRecentlyClosed: (instanceId: string, showRecentlyClosed: boolean) => void;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_DATA: QuickAccessData = {
  links: DEFAULT_LINKS,
  activeTab: "home",
  openBehavior: "currentTab",
  view: "grid",
  bookmarkPath: [],
  showTopSites: true,
  showOpenTabs: false,
  showRecentlyClosed: false,
};

const linkSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: httpUrlSchema,
  icon: z.string().optional(),
});

const RETIRED_TABS: Record<string, QuickAccessTab> = { recentlyClosed: "home" };

function normaliseData(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  const retired = typeof data.activeTab === "string" ? RETIRED_TABS[data.activeTab] : undefined;
  return retired ? { ...data, activeTab: retired, showRecentlyClosed: true } : data;
}

const dataSchema = z.object({
  links: tolerantArray(linkSchema),
  activeTab: z.enum(["home", "bookmarks", "history"]).catch("home"),
  openBehavior: openBehaviorSchema,
  view: z.enum(["grid", "list"]).catch("grid"),
  bookmarkPath: z.array(z.string()).catch([]),
  showTopSites: z.boolean().catch(true),
  showOpenTabs: z.boolean().catch(false),
  showRecentlyClosed: z.boolean().catch(false),
});

const persistedSchema = z.object({
  byInstance: tolerantRecord(z.preprocess(normaliseData, dataSchema)),
});

const LEGACY_KEYS = ["links", "activeTab", "openBehavior", "view", "showTopSites"] as const;

const gatedStorage = createGatedChromeStorage();

function update(
  state: QuickAccessState,
  instanceId: string,
  fn: (data: QuickAccessData) => QuickAccessData,
): Pick<QuickAccessState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, fn) };
}

function removeById(
  state: QuickAccessState,
  instanceId: string,
  id: string,
): Pick<QuickAccessState, "byInstance" | "removed"> {
  const data = state.byInstance[instanceId] ?? DEFAULT_DATA;
  const index = data.links.findIndex((link) => link.id === id);
  const link = data.links[index];
  if (!link) return { byInstance: state.byInstance, removed: state.removed };
  return {
    ...update(state, instanceId, (current) => ({
      ...current,
      links: current.links.filter((entry) => entry.id !== id),
    })),
    removed: { ...state.removed, [instanceId]: { link, index } },
  };
}

export const useQuickAccessStore = create<QuickAccessState>()(
  persist(
    (set, get) => ({
      byInstance: {},
      removed: {},
      addLink: (instanceId, title, url) => {
        const normalized = normalizeUrl(url);
        if (!normalized) return "invalid";
        const data = get().byInstance[instanceId] ?? DEFAULT_DATA;
        if (data.links.some((link) => link.url === normalized)) return "duplicate";
        const link: QuickLink = {
          id: crypto.randomUUID(),
          title: title.trim() || hostnameOf(normalized),
          url: normalized,
        };
        set((state) =>
          update(state, instanceId, (current) => ({
            ...current,
            links: [...current.links, link],
          })),
        );
        return "ok";
      },
      editLink: (instanceId, id, title, url) => {
        const normalized = normalizeUrl(url);
        if (!normalized) return "invalid";
        const data = get().byInstance[instanceId] ?? DEFAULT_DATA;
        if (data.links.some((link) => link.id !== id && link.url === normalized))
          return "duplicate";
        set((state) =>
          update(state, instanceId, (current) => ({
            ...current,
            links: current.links.map((link) =>
              link.id === id
                ? { ...link, title: title.trim() || hostnameOf(normalized), url: normalized }
                : link,
            ),
          })),
        );
        return "ok";
      },
      removeLink: (instanceId, id) => {
        const link = (get().byInstance[instanceId] ?? DEFAULT_DATA).links.find(
          (entry) => entry.id === id,
        );
        if (!link) return;
        set((state) => removeById(state, instanceId, id));
        showToast({
          key: `${instanceId}:${id}`,
          message: `Removed ${link.title}`,
          action: { kind: "undo", run: () => get().undoRemove(instanceId) },
          onExpire: () => get().dismissRemoved(instanceId, id),
        });
      },
      undoRemove: (instanceId) =>
        set((state) => {
          const entry = state.removed[instanceId];
          if (!entry) return state;
          return {
            ...update(state, instanceId, (data) => {
              if (data.links.some((link) => link.id === entry.link.id)) return data;
              const links = [...data.links];
              links.splice(Math.min(Math.max(entry.index, 0), links.length), 0, entry.link);
              return { ...data, links };
            }),
            removed: { ...state.removed, [instanceId]: undefined },
          };
        }),
      dismissRemoved: (instanceId, linkId) =>
        set((state) => {
          const entry = state.removed[instanceId];
          if (!entry || entry.link.id !== linkId) return state;
          return { removed: { ...state.removed, [instanceId]: undefined } };
        }),
      togglePin: (instanceId, title, url) => {
        const normalized = normalizeUrl(url);
        if (!normalized) return;
        const data = get().byInstance[instanceId] ?? DEFAULT_DATA;
        const existing = data.links.find((link) => link.url === normalized);
        if (existing) {
          get().removeLink(instanceId, existing.id);
          return;
        }
        const link: QuickLink = {
          id: crypto.randomUUID(),
          title: title.trim() || hostnameOf(normalized),
          url: normalized,
        };
        set((state) =>
          update(state, instanceId, (current) => ({ ...current, links: [...current.links, link] })),
        );
      },
      setLinks: (instanceId, links) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, links }))),
      setActiveTab: (instanceId, activeTab) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, activeTab }))),
      setOpenBehavior: (instanceId, openBehavior) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, openBehavior }))),
      setView: (instanceId, view) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, view }))),
      setBookmarkPath: (instanceId, bookmarkPath) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, bookmarkPath }))),
      setShowTopSites: (instanceId, showTopSites) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, showTopSites }))),
      setShowOpenTabs: (instanceId, showOpenTabs) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, showOpenTabs }))),
      setShowRecentlyClosed: (instanceId, showRecentlyClosed) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, showRecentlyClosed }))),
      removeInstance: (instanceId) =>
        set((state) => ({
          byInstance: dropInstance(state.byInstance, instanceId),
          removed: { ...state.removed, [instanceId]: undefined },
        })),
    }),
    {
      name: "widget:quick-access",
      storage: gatedStorage,
      version: 2,
      onRehydrateStorage: () => () => gatedStorage.open(useQuickAccessStore),
      partialize: (state) => ({ byInstance: state.byInstance }),
      migrate: (persisted, version) => {
        if (version >= 2) return persisted;
        if (!looksLikeLegacySingleton(persisted, LEGACY_KEYS)) return { byInstance: {} };
        const legacy = dataSchema.safeParse(persisted);
        return { byInstance: legacy.success ? { quickAccess: legacy.data } : {} };
      },
      merge: (persisted, current) =>
        mergePersisted("widget:quick-access", persistedSchema, persisted, current, (parsed) => ({
          ...current,
          byInstance: parsed.byInstance,
        })),
    },
  ),
);

export const useQuickAccess = createInstanceSelector(useQuickAccessStore, DEFAULT_DATA);

export function getQuickAccessData(instanceId: string): QuickAccessData {
  return useQuickAccessStore.getState().byInstance[instanceId] ?? DEFAULT_DATA;
}
