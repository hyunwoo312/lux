import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { keepPersisted, mergePersisted, tolerantRecord } from "@/lib/persist";
import { openBehaviorSchema, type OpenBehavior } from "@/lib/open-url";

export const PALETTE_SOURCES = [
  "bookmarks",
  "history",
  "openTabs",
  "topSites",
  "webSearch",
] as const;

export type PaletteSource = (typeof PALETTE_SOURCES)[number];

export const PALETTE_SOURCE_LABELS: Record<PaletteSource, string> = {
  bookmarks: "Bookmarks",
  history: "Browsing history",
  openTabs: "Open tabs",
  topSites: "Top sites",
  webSearch: "Web search",
};

export const SUGGESTION_MIN = 5;

export const SUGGESTION_MAX = 10;

const SUGGESTION_DEFAULT = 7;

type PaletteUse = { count: number; at: number };

type PaletteState = {
  enabled: Record<PaletteSource, boolean>;
  disabledCommands: Record<string, boolean>;
  suggestionsEnabled: boolean;
  suggestionCount: number;
  openIn: OpenBehavior;
  usage: Record<string, PaletteUse>;
  setSourceEnabled: (source: PaletteSource, value: boolean) => void;
  setCommandsEnabled: (ids: readonly string[], value: boolean) => void;
  setSuggestionsEnabled: (value: boolean) => void;
  setSuggestionCount: (value: number) => void;
  setOpenIn: (value: OpenBehavior) => void;
  clearUsage: () => void;
  recordUse: (id: string, now: number) => void;
};

const HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000;

const USAGE_LIMIT = 200;

const BOOST_PER_USE = 30;

const BOOST_CAP = 150;

const ALL_ON = Object.fromEntries(PALETTE_SOURCES.map((source) => [source, true])) as Record<
  PaletteSource,
  boolean
>;

const useSchema = z.object({
  count: z.number().catch(0),
  at: z.number().catch(0),
});

const persistedSchema = z.object({
  usage: tolerantRecord(useSchema),
  disabledCommands: tolerantRecord(z.boolean()),
  suggestionsEnabled: z.boolean().catch(true),
  suggestionCount: z.number().min(SUGGESTION_MIN).max(SUGGESTION_MAX).catch(SUGGESTION_DEFAULT),
  openIn: openBehaviorSchema,
  enabled: z.object(
    Object.fromEntries(
      PALETTE_SOURCES.map((source) => [source, z.boolean().catch(true)]),
    ) as Record<PaletteSource, z.ZodCatch<z.ZodBoolean>>,
  ),
});

const gatedStorage = createGatedChromeStorage();

export const usePaletteStore = create<PaletteState>()(
  persist(
    (set) => ({
      enabled: { ...ALL_ON },
      disabledCommands: {},
      suggestionsEnabled: true,
      suggestionCount: SUGGESTION_DEFAULT,
      openIn: "currentTab",
      usage: {},
      setSourceEnabled: (source, value) =>
        set((state) => ({ enabled: { ...state.enabled, [source]: value } })),
      setCommandsEnabled: (ids, value) =>
        set((state) => {
          const disabledCommands = { ...state.disabledCommands };
          for (const id of ids) {
            if (value) delete disabledCommands[id];
            else disabledCommands[id] = true;
          }
          return { disabledCommands };
        }),
      setSuggestionsEnabled: (value) => set({ suggestionsEnabled: value }),
      setSuggestionCount: (value) =>
        set({ suggestionCount: Math.min(SUGGESTION_MAX, Math.max(SUGGESTION_MIN, value)) }),
      setOpenIn: (value) => set({ openIn: value }),
      clearUsage: () => set({ usage: {} }),
      recordUse: (id, now) =>
        set((state) => {
          const previous = state.usage[id];
          const next = { ...state.usage, [id]: { count: (previous?.count ?? 0) + 1, at: now } };
          return { usage: prune(next, now) };
        }),
    }),
    {
      name: "palette",
      storage: gatedStorage,
      version: 1,
      migrate: keepPersisted,
      onRehydrateStorage: () => () => gatedStorage.open(usePaletteStore),
      partialize: (state) => ({
        enabled: state.enabled,
        disabledCommands: state.disabledCommands,
        suggestionsEnabled: state.suggestionsEnabled,
        suggestionCount: state.suggestionCount,
        openIn: state.openIn,
        usage: state.usage,
      }),
      merge: (persisted, current) =>
        mergePersisted("palette", persistedSchema, persisted, current, (parsed) => ({
          ...current,
          ...parsed,
        })),
    },
  ),
);

export function isSourceEnabled(source: PaletteSource): boolean {
  return usePaletteStore.getState().enabled[source];
}

export function isCommandEnabled(id: string): boolean {
  return usePaletteStore.getState().disabledCommands[id] !== true;
}

export function paletteOpenBehavior(): OpenBehavior {
  return usePaletteStore.getState().openIn;
}

function decayed(use: PaletteUse, now: number): number {
  return use.count * Math.pow(0.5, Math.max(0, now - use.at) / HALF_LIFE_MS);
}

function prune(usage: Record<string, PaletteUse>, now: number): Record<string, PaletteUse> {
  const entries = Object.entries(usage);
  if (entries.length <= USAGE_LIMIT) return usage;
  return Object.fromEntries(
    entries.sort(([, a], [, b]) => decayed(b, now) - decayed(a, now)).slice(0, USAGE_LIMIT),
  );
}

export function frecencyBoost(id: string, now: number = Date.now()): number {
  const use = usePaletteStore.getState().usage[id];
  if (use === undefined) return 0;
  return Math.min(BOOST_CAP, decayed(use, now) * BOOST_PER_USE);
}

export function recordPaletteUse(id: string): void {
  usePaletteStore.getState().recordUse(id, Date.now());
}
