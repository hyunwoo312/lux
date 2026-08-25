import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { keepPersisted, mergePersisted } from "@/lib/persist";
import { SETTINGS_TABS, type SettingsTab } from "@/settings/tabsMeta";

export { SETTINGS_TABS, type SettingsTab };

type SettingsState = {
  open: boolean;
  tab: SettingsTab;
  sidebarCollapsed: boolean;
  permissionHighlight: chrome.runtime.ManifestPermission | null;
  openSettings: (tab?: SettingsTab) => void;
  openPermissions: (permission: chrome.runtime.ManifestPermission) => void;
  clearPermissionHighlight: () => void;
  closeSettings: () => void;
  setTab: (tab: SettingsTab) => void;
  toggleSidebar: () => void;
};

const persistedSchema = z.object({
  tab: z.enum(SETTINGS_TABS).catch("appearance"),
  sidebarCollapsed: z.boolean().catch(false),
});

const gatedStorage = createGatedChromeStorage();

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      open: false,
      tab: "appearance",
      sidebarCollapsed: false,
      permissionHighlight: null,
      openSettings: (tab) => set((state) => ({ open: true, tab: tab ?? state.tab })),
      openPermissions: (permission) =>
        set({ open: true, tab: "accounts", permissionHighlight: permission }),
      clearPermissionHighlight: () => set({ permissionHighlight: null }),
      closeSettings: () => set({ open: false }),
      setTab: (tab) => set({ tab }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: "settings",
      storage: gatedStorage,
      version: 1,
      migrate: keepPersisted,
      onRehydrateStorage: () => () => gatedStorage.open(useSettingsStore),
      partialize: (state) => ({ tab: state.tab, sidebarCollapsed: state.sidebarCollapsed }),
      merge: (persisted, current) =>
        mergePersisted("settings", persistedSchema, persisted, current, (parsed) => ({
          ...current,
          ...parsed,
        })),
    },
  ),
);
