import { z } from "zod";
import { getLocal, removeLocal, setLocal } from "@/lib/local-store";
import { newId } from "@/lib/utils";
import {
  reportStorageFailure,
  reportStorageSuccess,
  watchStorageWrites,
} from "@/lib/storage-status";

const PREFIX = "lux.note.draft.";
const OWNER = newId("draft");
const failedDrafts = new Map<string, NoteDraft>();
const draftSchema = z.object({
  text: z.string(),
  baseText: z.string(),
  baseAt: z.number(),
  at: z.number(),
  conflict: z.boolean().default(false).catch(true),
});
export type NoteDraft = z.infer<typeof draftSchema>;

function entries(id?: string): { key: string; draft: NoteDraft }[] {
  const prefix = id === undefined ? PREFIX : `${PREFIX}${encodeURIComponent(id)}:`;
  const found: { key: string; draft: NoteDraft }[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const raw = getLocal(key);
      if (!raw) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      const result = draftSchema.safeParse(parsed);
      if (result.success) found.push({ key, draft: result.data });
    }
  } catch {
    reportStorageFailure("note-recovery-read");
  }
  return found;
}

export function readNoteDraft(id: string): NoteDraft | undefined {
  return entries(id).sort((a, b) => b.draft.at - a.draft.at)[0]?.draft;
}

export function saveNoteDraft(
  id: string,
  text: string,
  baseText: string,
  baseAt: number,
  conflict = false,
): NoteDraft {
  const draft = {
    text,
    baseText,
    baseAt,
    conflict,
    at: Math.max(Date.now(), baseAt + 1, (readNoteDraft(id)?.at ?? 0) + 1),
  };
  const key = `${PREFIX}${encodeURIComponent(id)}:${OWNER}`;
  if (setLocal(key, JSON.stringify(draft))) failedDrafts.delete(key);
  else failedDrafts.set(key, draft);
  return draft;
}

export function clearNoteDrafts(id: string): void {
  for (const entry of entries(id)) removeLocal(entry.key);
}

export function hasNoteDraft(id: string, draft: NoteDraft): boolean {
  const failed = failedDrafts.get(`${PREFIX}${encodeURIComponent(id)}:${OWNER}`);
  if (failed?.at === draft.at && failed.text === draft.text) return true;
  return entries(id).some(
    (entry) => entry.draft.at === draft.at && entry.draft.text === draft.text,
  );
}

export function discardNoteDraft(id: string, draft: NoteDraft): void {
  for (const entry of entries(id)) {
    if (entry.draft.at <= draft.at && entry.draft.text === draft.text) removeLocal(entry.key);
  }
}

const savedSchema = z.object({
  state: z.object({ byInstance: z.record(z.string(), z.object({ text: z.string() })) }),
});

watchStorageWrites((name, value) => {
  if (name !== "widget:note") return;
  const result = savedSchema.safeParse(value);
  if (!result.success) return;
  for (const { key, draft } of entries()) {
    let id: string;
    try {
      id = decodeURIComponent(key.slice(PREFIX.length, key.lastIndexOf(":")));
    } catch {
      continue;
    }
    if (result.data.state.byInstance[id]?.text === draft.text) removeLocal(key);
  }
  for (const [key, draft] of failedDrafts) {
    const id = decodeURIComponent(key.slice(PREFIX.length, key.lastIndexOf(":")));
    if (result.data.state.byInstance[id]?.text === draft.text) {
      failedDrafts.delete(key);
      reportStorageSuccess(key, value);
    }
  }
});
