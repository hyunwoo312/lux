import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { mergePersisted } from "@/lib/persist";
import { shortcutsEqual, type Shortcut } from "@/lib/shortcuts";
import {
  SHORTCUT_DEFAULTS,
  SHORTCUT_DEFINITIONS,
  type ShortcutAction,
} from "@/stores/shortcutDefinitions";

export { SHORTCUT_DEFAULTS, SHORTCUT_DEFINITIONS, type ShortcutAction };

export const MAX_SHORTCUT_SLOTS = 2;

type ShortcutsState = Record<ShortcutAction, Shortcut[]> & {
  setShortcutSlot: (action: ShortcutAction, slot: number, shortcut: Shortcut) => void;
  clearShortcutSlot: (action: ShortcutAction, slot: number) => void;
  resetShortcut: (action: ShortcutAction) => void;
  resetAll: () => void;
};

const shortcutSchema = z.object({
  mod: z.boolean(),
  shift: z.boolean(),
  alt: z.boolean(),
  key: z.string().min(1),
});

function bindingsSchema(fallback: Shortcut[]) {
  return z
    .unknown()
    .transform((raw) => {
      if (!Array.isArray(raw)) return fallback;
      const kept = raw.flatMap((entry) => {
        const parsed = shortcutSchema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
      });
      if (raw.length > 0 && kept.length === 0) return fallback;
      return kept.slice(0, MAX_SHORTCUT_SLOTS);
    })
    .default(fallback);
}

const persistedSchema = z.object(
  Object.fromEntries(
    SHORTCUT_DEFINITIONS.map((definition) => [
      definition.id,
      bindingsSchema(SHORTCUT_DEFAULTS[definition.id]),
    ]),
  ) as Record<ShortcutAction, ReturnType<typeof bindingsSchema>>,
);

const initialBindings = () =>
  Object.fromEntries(
    SHORTCUT_DEFINITIONS.map((definition) => [definition.id, SHORTCUT_DEFAULTS[definition.id]]),
  ) as Record<ShortcutAction, Shortcut[]>;

const gatedStorage = createGatedChromeStorage();

export const useShortcutsStore = create<ShortcutsState>()(
  persist(
    (set) => ({
      ...initialBindings(),
      setShortcutSlot: (action, slot, shortcut) =>
        set((state) => {
          const current = state[action];
          if (current.some((held, index) => index !== slot && shortcutsEqual(held, shortcut))) {
            return {};
          }
          const next = [...current];
          if (slot < next.length) next[slot] = shortcut;
          else if (slot === next.length && next.length < MAX_SHORTCUT_SLOTS) next.push(shortcut);
          return { [action]: next };
        }),
      clearShortcutSlot: (action, slot) =>
        set((state) => ({ [action]: state[action].filter((_, index) => index !== slot) })),
      resetShortcut: (action) => set({ [action]: SHORTCUT_DEFAULTS[action] }),
      resetAll: () => set(initialBindings()),
    }),
    {
      name: "shortcuts",
      storage: gatedStorage,
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) =>
        Object.fromEntries(
          SHORTCUT_DEFINITIONS.map((definition) => [definition.id, state[definition.id]]),
        ) as Record<ShortcutAction, Shortcut[]>,
      merge: (persisted, current) =>
        mergePersisted("shortcuts", persistedSchema, persisted, current, (parsed) => ({
          ...current,
          ...parsed,
        })),
    },
  ),
);
