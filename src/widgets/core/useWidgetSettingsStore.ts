import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance } from "@/widgets/core/byInstance";

export type WidgetBackground = "glass" | "solid";

type WidgetSettings = {
  background?: WidgetBackground;
};

type WidgetSettingsState = {
  settings: Record<string, WidgetSettings>;
  setBackground: (id: string, background: WidgetBackground) => void;
  removeInstance: (id: string) => void;
};

const persistedSchema = z.object({
  settings: z.record(z.string(), z.object({ background: z.enum(["glass", "solid"]).optional() })),
});

const gatedStorage = createGatedChromeStorage();

export const useWidgetSettingsStore = create<WidgetSettingsState>()(
  persist(
    (set) => ({
      settings: {},
      setBackground: (id, background) =>
        set((state) => ({
          settings: { ...state.settings, [id]: { ...state.settings[id], background } },
        })),
      removeInstance: (id) => set((state) => ({ settings: dropInstance(state.settings, id) })),
    }),
    {
      name: "widget-settings",
      storage: gatedStorage,
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({ settings: state.settings }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return { ...current, settings: parsed.data.settings };
      },
    },
  ),
);

registerInstanceCleanup((id) => useWidgetSettingsStore.getState().removeInstance(id));

export function useWidgetBackground(id: string): WidgetBackground {
  return useWidgetSettingsStore((s) => s.settings[id]?.background ?? "glass");
}
