import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import type { NoteFontSize } from "@/widgets/note/types";

type NoteData = {
  text: string;
  fontSize: NoteFontSize;
};

type NoteState = {
  byInstance: Record<string, NoteData>;
  setText: (id: string, text: string) => void;
  setFontSize: (id: string, fontSize: NoteFontSize) => void;
  removeInstance: (id: string) => void;
};

const DEFAULT_NOTE: NoteData = { text: "", fontSize: "base" };

const noteDataSchema = z.object({
  text: z.string(),
  fontSize: z.enum(["sm", "base", "lg"]),
});

const persistedSchema = z.object({
  byInstance: z.record(z.string(), noteDataSchema),
});

const legacySchema = z.object({
  text: z.string(),
  fontSize: z.enum(["sm", "base", "lg"]),
});

const gatedStorage = createGatedChromeStorage();

function update(
  state: NoteState,
  id: string,
  fn: (data: NoteData) => NoteData,
): Pick<NoteState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, id, DEFAULT_NOTE, fn) };
}

export const useNoteStore = create<NoteState>()(
  persist(
    (set) => ({
      byInstance: {},
      setText: (id, text) => set((state) => update(state, id, (data) => ({ ...data, text }))),
      setFontSize: (id, fontSize) =>
        set((state) => update(state, id, (data) => ({ ...data, fontSize }))),
      removeInstance: (id) => set((state) => ({ byInstance: dropInstance(state.byInstance, id) })),
    }),
    {
      name: "widget:note",
      storage: gatedStorage,
      version: 2,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({ byInstance: state.byInstance }),
      migrate: (persisted, version) => {
        if (version >= 2) return persisted;
        const legacy = legacySchema.safeParse(persisted);
        return { byInstance: legacy.success ? { note: legacy.data } : {} };
      },
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return { ...current, byInstance: parsed.data.byInstance };
      },
    },
  ),
);

registerInstanceCleanup((id) => useNoteStore.getState().removeInstance(id));

export function useNote(id: string): NoteData {
  return useNoteStore((s) => s.byInstance[id] ?? DEFAULT_NOTE);
}
