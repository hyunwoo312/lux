import { z } from "zod";
import { createPersistedStore } from "@/lib/storage";
import { SETTINGS_TABS, type SettingsTab } from "@/stores/settingsTabs";
import type { SettingEntry } from "@/settings";

export { SETTINGS_TABS, type SettingsTab };

type SettingsState = {
  open: boolean;
  tab: SettingsTab;
  sidebarCollapsed: boolean;
  permissionHighlight: chrome.runtime.ManifestPermission | null;
  visitedTabs: SettingsTab[];
  searchOpen: boolean;
  searchQuery: string;
  destination: SettingEntry | null;
  clearDestination: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;
  navigateToSetting: (entry: SettingEntry) => void;
  openSettings: (tab?: SettingsTab) => void;
  openPermissions: (permission: chrome.runtime.ManifestPermission) => void;
  reopenAfterReload: (permission: chrome.runtime.ManifestPermission) => void;
  clearPermissionHighlight: () => void;
  closeSettings: () => void;
  setTab: (tab: SettingsTab) => void;
  toggleSidebar: () => void;
  reset: () => void;
};

const persistedSchema = z.object({
  tab: z.enum(SETTINGS_TABS).catch("appearance"),
  sidebarCollapsed: z.boolean().catch(false),
});

export const useSettingsStore = createPersistedStore<SettingsState>()(
  (set) => ({
    open: false,
    tab: "appearance",
    sidebarCollapsed: false,
    permissionHighlight: null,
    visitedTabs: [],
    searchOpen: false,
    searchQuery: "",
    destination: null,
    clearDestination: () => set({ destination: null }),
    openSearch: () => set({ searchOpen: true, destination: null, permissionHighlight: null }),
    closeSearch: () => set({ searchOpen: false }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    navigateToSetting: (entry) =>
      set((state) => ({
        tab: entry.tab,
        visitedTabs: [...new Set([...state.visitedTabs, entry.tab])],
        searchOpen: false,
        destination: { ...entry },
        permissionHighlight: null,
      })),
    openSettings: (tab) =>
      set((state) => ({
        open: true,
        tab: tab ?? state.tab,
        visitedTabs: state.open
          ? [...new Set([...state.visitedTabs, tab ?? state.tab])]
          : [tab ?? state.tab],
        searchOpen: false,
        searchQuery: "",
        destination: null,
        permissionHighlight: null,
      })),
    openPermissions: (permission) =>
      set((state) => ({
        open: true,
        tab: "accounts",
        visitedTabs: state.open
          ? [...new Set([...state.visitedTabs, "accounts" as const])]
          : ["accounts"],
        searchOpen: false,
        destination: null,
        permissionHighlight: permission,
      })),
    reopenAfterReload: (permission) =>
      set((state) => ({
        open: true,
        visitedTabs: [state.tab],
        searchOpen: false,
        destination: null,
        permissionHighlight: state.tab === "accounts" ? permission : null,
      })),
    clearPermissionHighlight: () => set({ permissionHighlight: null }),
    closeSettings: () =>
      set({
        open: false,
        searchOpen: false,
        searchQuery: "",
        destination: null,
        visitedTabs: [],
        permissionHighlight: null,
      }),
    setTab: (tab) =>
      set((state) => ({
        tab,
        searchOpen: false,
        destination: null,
        visitedTabs: [...new Set([...state.visitedTabs, tab])],
        permissionHighlight: null,
      })),
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    reset: () => set({ sidebarCollapsed: false }),
  }),
  {
    name: "settings",
    partialize: (state) => ({ tab: state.tab, sidebarCollapsed: state.sidebarCollapsed }),
    schema: persistedSchema,
    build: (parsed, current) => ({
      ...current,
      ...parsed,
    }),
  },
);
