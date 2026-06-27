import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import type { NoteFontSize } from "@/widgets/note/types";

type NoteState = {
  text: string;
  fontSize: NoteFontSize;
  setText: (text: string) => void;
  setFontSize: (fontSize: NoteFontSize) => void;
};

const persistedSchema = z.object({
  text: z.string(),
  fontSize: z.enum(["sm", "base", "lg"]),
});

const gatedStorage = createGatedChromeStorage();

export const useNoteStore = create<NoteState>()(
  persist(
    (set) => ({
      text: "",
      fontSize: "base",
      setText: (text) => set({ text }),
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    {
      name: "widget:note",
      storage: gatedStorage,
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({ text: state.text, fontSize: state.fontSize }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return { ...current, ...parsed.data };
      },
    },
  ),
);
