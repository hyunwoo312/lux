import { useLayoutEffect } from "react";
import { create } from "zustand";
import { getNoteData, useNoteStore } from "@/widgets/note/useNoteStore";

type DraftState = {
  byInstance: Record<string, string>;
  publish: (id: string, text: string) => void;
  clear: (id: string) => void;
};

const useDraftStore = create<DraftState>()((set) => ({
  byInstance: {},
  publish: (id, text) =>
    set((state) =>
      state.byInstance[id] === text
        ? state
        : {
            byInstance: { ...state.byInstance, [id]: text },
          },
    ),
  clear: (id) =>
    set((state) => {
      if (!(id in state.byInstance)) return state;
      const byInstance = { ...state.byInstance };
      delete byInstance[id];
      return { byInstance };
    }),
}));

export function usePublishNoteDraft(id: string, text: string): void {
  useLayoutEffect(() => {
    useDraftStore.getState().publish(id, text);
  }, [id, text]);
  useLayoutEffect(() => () => useDraftStore.getState().clear(id), [id]);
}

export function useNoteDraftText(id: string): string {
  const draft = useDraftStore((state) => state.byInstance[id]);
  const saved = useNoteStore((state) => state.byInstance[id]?.text ?? "");
  return draft ?? saved;
}

export function getNoteDraftText(id: string): string {
  return useDraftStore.getState().byInstance[id] ?? getNoteData(id).text;
}
