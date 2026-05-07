import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";
import { chromeStorageAdapter } from "@/lib/storage";
import type { WidgetType } from "@/widgets/core/types";

export type WidgetBackground = "glass" | "solid";

type WidgetSettings = {
  background?: WidgetBackground;
};

type WidgetSettingsState = {
  settings: Partial<Record<WidgetType, WidgetSettings>>;
  setBackground: (type: WidgetType, background: WidgetBackground) => void;
};

const persistedSchema = z.object({
  settings: z.record(z.string(), z.object({ background: z.enum(["glass", "solid"]).optional() })),
});

export const useWidgetSettingsStore = create<WidgetSettingsState>()(
  persist(
    (set) => ({
      settings: {},
      setBackground: (type, background) =>
        set((state) => ({
          settings: { ...state.settings, [type]: { ...state.settings[type], background } },
        })),
    }),
    {
      name: "widget-settings",
      storage: createJSONStorage(() => chromeStorageAdapter),
      version: 1,
      partialize: (state) => ({ settings: state.settings }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return { ...current, settings: parsed.data.settings };
      },
    },
  ),
);

export function useWidgetBackground(type: WidgetType): WidgetBackground {
  return useWidgetSettingsStore((s) => s.settings[type]?.background ?? "glass");
}
