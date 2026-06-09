import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";

type AppSettingsState = {
  clock24h: boolean;
  showGridLines: boolean;
  setClock24h: (value: boolean) => void;
  setShowGridLines: (value: boolean) => void;
  reset: () => void;
};

const DEFAULTS = { clock24h: false, showGridLines: false };

const persistedSchema = z
  .object({ clock24h: z.boolean(), showGridLines: z.boolean() })
  .partial();

const gatedStorage = createGatedChromeStorage();

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setClock24h: (value) => set({ clock24h: value }),
      setShowGridLines: (value) => set({ showGridLines: value }),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "app-settings",
      storage: gatedStorage,
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({
        clock24h: state.clock24h,
        showGridLines: state.showGridLines,
      }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return { ...current, ...parsed.data };
      },
    },
  ),
);
