import { z } from "zod";
import { createPersistedStore } from "@/lib/storage";
import { looksLikeLegacySingleton, tolerantRecord } from "@/lib/persist";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { NOTE_FONT_SIZES, type NoteFontSize } from "@/widgets/note/types";
import { clearNoteDrafts } from "@/widgets/note/lib/drafts";

type NoteData = {
  text: string;
  fontSize: NoteFontSize;
  updatedAt?: number;
};

type NoteState = {
  byInstance: Record<string, NoteData>;
  setText: (id: string, text: string, updatedAt?: number) => void;
  setFontSize: (id: string, fontSize: NoteFontSize) => void;
  removeInstance: (id: string) => void;
};

const DEFAULT_NOTE: NoteData = { text: "", fontSize: "base" };

const noteDataSchema = z.object({
  text: z.string().catch(""),
  fontSize: z.enum(NOTE_FONT_SIZES).catch("base"),
  updatedAt: z.number().optional().catch(undefined),
});

const persistedSchema = z.object({
  byInstance: tolerantRecord(noteDataSchema),
});

const LEGACY_KEYS = ["text", "fontSize"] as const;

const envelopeSchema = z.object({ state: persistedSchema, version: z.number().optional() });

function resolveNoteWrite(stored: unknown, next: unknown, previous: unknown): unknown {
  if (typeof stored === "string") stored = JSON.parse(stored);
  const desired = envelopeSchema.parse(next);
  const current =
    stored === undefined ? { state: { byInstance: {} } } : envelopeSchema.parse(stored);
  const before = envelopeSchema.safeParse(previous);
  const original = before.success ? before.data.state.byInstance : {};
  const byInstance = { ...current.state.byInstance };
  for (const id of Object.keys(original)) {
    if (!(id in desired.state.byInstance)) delete byInstance[id];
  }
  for (const [id, note] of Object.entries(desired.state.byInstance)) {
    const old = original[id];
    const saved = byInstance[id];
    if (saved && old && JSON.stringify(note) === JSON.stringify(old)) continue;
    if (!saved) {
      byInstance[id] = note;
      continue;
    }
    const textChanged = !old || note.text !== old.text || note.updatedAt !== old.updatedAt;
    byInstance[id] = {
      ...saved,
      ...(textChanged && (note.updatedAt ?? 0) >= (saved.updatedAt ?? 0)
        ? { text: note.text, updatedAt: note.updatedAt }
        : {}),
      ...(!old || note.fontSize !== old.fontSize ? { fontSize: note.fontSize } : {}),
    };
  }
  return { ...desired, state: { byInstance } };
}

function update(
  state: NoteState,
  id: string,
  fn: (data: NoteData) => NoteData,
): Pick<NoteState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, id, DEFAULT_NOTE, fn) };
}

export const useNoteStore = createPersistedStore<NoteState>()(
  (set) => ({
    byInstance: {},
    setText: (id, text, updatedAt) =>
      set((state) =>
        update(state, id, (data) => ({
          ...data,
          text,
          updatedAt: updatedAt ?? Math.max(Date.now(), (data.updatedAt ?? 0) + 1),
        })),
      ),
    setFontSize: (id, fontSize) =>
      set((state) => update(state, id, (data) => ({ ...data, fontSize }))),
    removeInstance: (id) => {
      clearNoteDrafts(id);
      set((state) => ({ byInstance: dropInstance(state.byInstance, id) }));
    },
  }),
  {
    name: "widget:note",
    resolveWrite: resolveNoteWrite,
    version: 2,
    partialize: (state) => ({ byInstance: state.byInstance }),
    migrate: (persisted, version) => {
      if (version >= 2) return persisted;
      if (!looksLikeLegacySingleton(persisted, LEGACY_KEYS)) return { byInstance: {} };
      const legacy = noteDataSchema.safeParse(persisted);
      return { byInstance: legacy.success ? { note: legacy.data } : {} };
    },
    schema: persistedSchema,
    build: (parsed, current) => ({
      ...current,
      byInstance: parsed.byInstance,
    }),
  },
);

export function useNote(id: string): NoteData {
  return useNoteStore((s) => s.byInstance[id] ?? DEFAULT_NOTE);
}

export function getNoteData(id: string): NoteData {
  return useNoteStore.getState().byInstance[id] ?? DEFAULT_NOTE;
}
