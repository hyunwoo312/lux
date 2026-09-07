import { z } from "zod";
import { createPersistedStore } from "@/lib/storage";
import { SETTINGS_TABS, type SettingsTab } from "@/stores/settingsTabs";

export { SETTINGS_TABS, type SettingsTab };

type SettingsState = {
  open: boolean;
  tab: SettingsTab;
  sidebarCollapsed: boolean;
  permissionHighlight: chrome.runtime.ManifestPermission | null;
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
    openSettings: (tab) => set((state) => ({ open: true, tab: tab ?? state.tab })),
    openPermissions: (permission) =>
      set({ open: true, tab: "accounts", permissionHighlight: permission }),
    reopenAfterReload: (permission) =>
      set((state) => ({
        open: true,
        permissionHighlight: state.tab === "accounts" ? permission : null,
      })),
    clearPermissionHighlight: () => set({ permissionHighlight: null }),
    closeSettings: () => set({ open: false }),
    setTab: (tab) => set({ tab }),
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
