import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { mergePersisted, tolerantRecord } from "@/lib/persist";
import { CLOCK_DATE_FORMATS, type ClockDateFormat } from "@/lib/clock";

export const REFRESH_CADENCES = ["default", "relaxed", "custom"] as const;
export type RefreshCadence = (typeof REFRESH_CADENCES)[number];

export const REFRESH_STEPS = [0.5, 1, 2, 4] as const;

const PRESET_SCALE: Partial<Record<RefreshCadence, number>> = { default: 1, relaxed: 2 };

type AppSettingsState = {
  clock24h: boolean;
  showClock: boolean;
  clockDate: ClockDateFormat;
  showGridLines: boolean;
  refreshCadence: RefreshCadence;
  widgetRefresh: Record<string, number>;
  setClock24h: (value: boolean) => void;
  setShowClock: (value: boolean) => void;
  setClockDate: (value: ClockDateFormat) => void;
  setShowGridLines: (value: boolean) => void;
  applyRefreshPreset: (types: string[], cadence: Exclude<RefreshCadence, "custom">) => void;
  setWidgetRefresh: (type: string, scale: number) => void;
  reset: () => void;
};

const DEFAULTS = {
  clock24h: false,
  showClock: true,
  clockDate: "off" as ClockDateFormat,
  showGridLines: false,
  refreshCadence: "default" as RefreshCadence,
  widgetRefresh: {} as Record<string, number>,
};

const persistedSchema = z.object({
  clock24h: z.boolean().catch(DEFAULTS.clock24h),
  showClock: z.boolean().catch(DEFAULTS.showClock),
  clockDate: z.enum(CLOCK_DATE_FORMATS).catch(DEFAULTS.clockDate),
  showGridLines: z.boolean().catch(DEFAULTS.showGridLines),
  refreshCadence: z.enum(REFRESH_CADENCES).catch("custom"),
  widgetRefresh: tolerantRecord(z.number().min(0.5).max(4)),
});

const gatedStorage = createGatedChromeStorage();

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setClock24h: (value) => set({ clock24h: value }),
      setShowClock: (value) => set({ showClock: value }),
      setClockDate: (value) => set({ clockDate: value }),
      setShowGridLines: (value) => set({ showGridLines: value }),
      applyRefreshPreset: (types, cadence) =>
        set(() => {
          const scale = PRESET_SCALE[cadence] ?? 1;
          const widgetRefresh: Record<string, number> = {};
          for (const type of types) widgetRefresh[type] = scale;
          return { widgetRefresh, refreshCadence: cadence };
        }),
      setWidgetRefresh: (type, scale) =>
        set((state) => ({
          widgetRefresh: { ...state.widgetRefresh, [type]: scale },
          refreshCadence: "custom",
        })),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "app-settings",
      storage: gatedStorage,
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({
        clock24h: state.clock24h,
        showClock: state.showClock,
        clockDate: state.clockDate,
        showGridLines: state.showGridLines,
        refreshCadence: state.refreshCadence,
        widgetRefresh: state.widgetRefresh,
      }),
      merge: (persisted, current) =>
        mergePersisted("app-settings", persistedSchema, persisted, current, (parsed) => ({
          ...current,
          ...parsed,
        })),
    },
  ),
);
