import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { hostnameOf, normalizeUrl } from "@/widgets/quick-access/lib/url";
import type {
  OpenBehavior,
  QuickAccessTab,
  QuickAccessView,
  QuickLink,
} from "@/widgets/quick-access/types";

const DEFAULT_LINKS: QuickLink[] = [
  { id: "gmail", title: "Gmail", url: "https://mail.google.com/" },
  { id: "calendar", title: "Calendar", url: "https://calendar.google.com/" },
  { id: "github", title: "GitHub", url: "https://github.com/" },
];

type QuickAccessState = {
  links: QuickLink[];
  activeTab: QuickAccessTab;
  openBehavior: OpenBehavior;
  view: QuickAccessView;
  showTopSites: boolean;
  addLink: (title: string, url: string) => void;
  editLink: (id: string, title: string, url: string) => void;
  removeLink: (id: string) => void;
  togglePin: (title: string, url: string) => void;
  setLinks: (links: QuickLink[]) => void;
  setActiveTab: (tab: QuickAccessTab) => void;
  setOpenBehavior: (openBehavior: OpenBehavior) => void;
  setView: (view: QuickAccessView) => void;
  setShowTopSites: (showTopSites: boolean) => void;
};

const linkSchema = z.object({ id: z.string(), title: z.string(), url: z.string() });

const persistedSchema = z.object({
  links: z.array(linkSchema),
  activeTab: z.enum(["home", "bookmarks", "recentlyClosed", "history"]),
  openBehavior: z.enum(["currentTab", "newTab"]),
  view: z.enum(["grid", "list"]),
  showTopSites: z.boolean().default(true),
});

const gatedStorage = createGatedChromeStorage();

export const useQuickAccessStore = create<QuickAccessState>()(
  persist(
    (set) => ({
      links: DEFAULT_LINKS,
      activeTab: "home",
      openBehavior: "currentTab",
      view: "grid",
      showTopSites: true,
      addLink: (title, url) =>
        set((state) => {
          const normalized = normalizeUrl(url);
          if (!normalized || state.links.some((link) => link.url === normalized)) return state;
          const link: QuickLink = {
            id: crypto.randomUUID(),
            title: title.trim() || hostnameOf(normalized),
            url: normalized,
          };
          return { links: [...state.links, link] };
        }),
      editLink: (id, title, url) =>
        set((state) => {
          const normalized = normalizeUrl(url);
          if (!normalized) return state;
          if (state.links.some((link) => link.id !== id && link.url === normalized)) return state;
          return {
            links: state.links.map((link) =>
              link.id === id
                ? { ...link, title: title.trim() || hostnameOf(normalized), url: normalized }
                : link,
            ),
          };
        }),
      removeLink: (id) => set((state) => ({ links: state.links.filter((link) => link.id !== id) })),
      togglePin: (title, url) =>
        set((state) => {
          const normalized = normalizeUrl(url);
          if (!normalized) return state;
          const existing = state.links.find((link) => link.url === normalized);
          if (existing) {
            return { links: state.links.filter((link) => link.id !== existing.id) };
          }
          const link: QuickLink = {
            id: crypto.randomUUID(),
            title: title.trim() || hostnameOf(normalized),
            url: normalized,
          };
          return { links: [...state.links, link] };
        }),
      setLinks: (links) => set({ links }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setOpenBehavior: (openBehavior) => set({ openBehavior }),
      setView: (view) => set({ view }),
      setShowTopSites: (showTopSites) => set({ showTopSites }),
    }),
    {
      name: "widget:quick-access",
      storage: createJSONStorage(() => gatedStorage),
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({
        links: state.links,
        activeTab: state.activeTab,
        openBehavior: state.openBehavior,
        view: state.view,
        showTopSites: state.showTopSites,
      }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return { ...current, ...parsed.data };
      },
    },
  ),
);
