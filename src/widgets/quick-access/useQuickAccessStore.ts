import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import { firstGrapheme } from "@/widgets/quick-access/lib/icon";
import { hostnameOf, normalizeUrl } from "@/widgets/quick-access/lib/url";
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
  showTopSites: boolean;
};

type QuickAccessState = {
  byInstance: Record<string, QuickAccessData>;
  removed: Record<string, RemovedLink | undefined>;
  addLink: (instanceId: string, title: string, url: string, icon: string) => LinkResult;
  editLink: (
    instanceId: string,
    id: string,
    title: string,
    url: string,
    icon: string,
  ) => LinkResult;
  removeLink: (instanceId: string, id: string) => void;
  undoRemove: (instanceId: string) => void;
  dismissRemoved: (instanceId: string) => void;
  togglePin: (instanceId: string, title: string, url: string) => void;
  setLinks: (instanceId: string, links: QuickLink[]) => void;
  setActiveTab: (instanceId: string, tab: QuickAccessTab) => void;
  setOpenBehavior: (instanceId: string, openBehavior: OpenBehavior) => void;
  setView: (instanceId: string, view: QuickAccessView) => void;
  setShowTopSites: (instanceId: string, showTopSites: boolean) => void;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_DATA: QuickAccessData = {
  links: DEFAULT_LINKS,
  activeTab: "home",
  openBehavior: "currentTab",
  view: "grid",
  showTopSites: true,
};

const linkSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  icon: z.string().optional(),
});

const dataSchema = z.object({
  links: z.array(linkSchema),
  activeTab: z.enum(["home", "bookmarks", "recentlyClosed", "history"]),
  openBehavior: z.enum(["currentTab", "newTab"]),
  view: z.enum(["grid", "list"]),
  showTopSites: z.boolean().default(true),
});

const persistedSchema = z.object({
  byInstance: z.record(z.string(), dataSchema),
});

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
      addLink: (instanceId, title, url, icon) => {
        const normalized = normalizeUrl(url);
        if (!normalized) return "invalid";
        const data = get().byInstance[instanceId] ?? DEFAULT_DATA;
        if (data.links.some((link) => link.url === normalized)) return "duplicate";
        const link: QuickLink = {
          id: crypto.randomUUID(),
          title: title.trim() || hostnameOf(normalized),
          url: normalized,
          icon: firstGrapheme(icon) || undefined,
        };
        set((state) =>
          update(state, instanceId, (current) => ({
            ...current,
            links: [...current.links, link],
          })),
        );
        return "ok";
      },
      editLink: (instanceId, id, title, url, icon) => {
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
                ? {
                    ...link,
                    title: title.trim() || hostnameOf(normalized),
                    url: normalized,
                    icon: firstGrapheme(icon) || undefined,
                  }
                : link,
            ),
          })),
        );
        return "ok";
      },
      removeLink: (instanceId, id) => set((state) => removeById(state, instanceId, id)),
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
      dismissRemoved: (instanceId) =>
        set((state) => ({ removed: { ...state.removed, [instanceId]: undefined } })),
      togglePin: (instanceId, title, url) =>
        set((state) => {
          const normalized = normalizeUrl(url);
          if (!normalized) return state;
          const data = state.byInstance[instanceId] ?? DEFAULT_DATA;
          const existing = data.links.find((link) => link.url === normalized);
          if (existing) return removeById(state, instanceId, existing.id);
          const link: QuickLink = {
            id: crypto.randomUUID(),
            title: title.trim() || hostnameOf(normalized),
            url: normalized,
          };
          return update(state, instanceId, (current) => ({
            ...current,
            links: [...current.links, link],
          }));
        }),
      setLinks: (instanceId, links) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, links }))),
      setActiveTab: (instanceId, activeTab) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, activeTab }))),
      setOpenBehavior: (instanceId, openBehavior) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, openBehavior }))),
      setView: (instanceId, view) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, view }))),
      setShowTopSites: (instanceId, showTopSites) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, showTopSites }))),
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
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({ byInstance: state.byInstance }),
      migrate: (persisted, version) => {
        if (version >= 2) return persisted;
        const legacy = dataSchema.safeParse(persisted);
        return { byInstance: legacy.success ? { quickAccess: legacy.data } : {} };
      },
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return { ...current, byInstance: parsed.data.byInstance };
      },
    },
  ),
);

registerInstanceCleanup((instanceId) => useQuickAccessStore.getState().removeInstance(instanceId));

export const useQuickAccess = createInstanceSelector(useQuickAccessStore, DEFAULT_DATA);

export function getQuickAccessData(instanceId: string): QuickAccessData {
  return useQuickAccessStore.getState().byInstance[instanceId] ?? DEFAULT_DATA;
}
