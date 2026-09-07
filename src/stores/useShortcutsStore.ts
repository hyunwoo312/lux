import { z } from "zod";
import { createPersistedStore } from "@/lib/storage";
import { shortcutsEqual, type Shortcut } from "@/lib/shortcuts";
import {
  SHORTCUT_DEFAULTS,
  SHORTCUT_DEFINITIONS,
  type ShortcutAction,
} from "@/stores/shortcutDefinitions";

export { SHORTCUT_DEFAULTS, SHORTCUT_DEFINITIONS, type ShortcutAction };

export const MAX_SHORTCUT_SLOTS = 2;

type ShortcutsState = Record<ShortcutAction, Shortcut[]> & {
  setShortcutSlot: (action: ShortcutAction, slot: number, shortcut: Shortcut) => boolean;
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

export const useShortcutsStore = createPersistedStore<ShortcutsState>()(
  (set, get) => ({
    ...initialBindings(),
    setShortcutSlot: (action, slot, shortcut) => {
      const current = get()[action];
      if (current.some((held, index) => index !== slot && shortcutsEqual(held, shortcut))) {
        return false;
      }
      const next = [...current];
      if (slot < next.length) next[slot] = shortcut;
      else if (next.length < MAX_SHORTCUT_SLOTS) next.push(shortcut);
      set(() => ({ [action]: next }));
      return true;
    },
    clearShortcutSlot: (action, slot) =>
      set((state) => ({ [action]: state[action].filter((_, index) => index !== slot) })),
    resetShortcut: (action) => set({ [action]: SHORTCUT_DEFAULTS[action] }),
    resetAll: () => set(initialBindings()),
  }),
  {
    name: "shortcuts",
    partialize: (state) =>
      Object.fromEntries(
        SHORTCUT_DEFINITIONS.map((definition) => [definition.id, state[definition.id]]),
      ) as Record<ShortcutAction, Shortcut[]>,
    schema: persistedSchema,
    build: (parsed, current) => ({
      ...current,
      ...parsed,
    }),
  },
);
