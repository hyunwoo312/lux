import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { FEEDBACK_CATEGORIES, type FeedbackDraft } from "@/feedback/types";

export const COOLDOWN_MS = 60_000;
export const DUPLICATE_WINDOW_MS = 10 * 60_000;

const EMPTY_DRAFT: FeedbackDraft = {
  category: "bug",
  message: "",
  includeDiagnostics: true,
};

type FeedbackState = {
  draft: FeedbackDraft;
  lastSentAt: number;
  lastSentHash: string;
  setDraft: (patch: Partial<FeedbackDraft>) => void;
  clearDraft: () => void;
  recordSent: (hash: string, at: number) => void;
};

const draftSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES).catch("bug"),
  message: z.string().max(5000).catch(""),
  includeDiagnostics: z.boolean().catch(true),
});

const persistedSchema = z.object({
  draft: draftSchema.catch(() => ({ ...EMPTY_DRAFT })),
  lastSentAt: z.number().catch(0),
  lastSentHash: z.string().catch(""),
});

const gatedStorage = createGatedChromeStorage();

export const useFeedbackStore = create<FeedbackState>()(
  persist(
    (set) => ({
      draft: EMPTY_DRAFT,
      lastSentAt: 0,
      lastSentHash: "",
      setDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
      clearDraft: () =>
        set((state) => ({
          draft: { ...EMPTY_DRAFT, includeDiagnostics: state.draft.includeDiagnostics },
        })),
      recordSent: (hash, at) => set({ lastSentHash: hash, lastSentAt: at }),
    }),
    {
      name: "lux:feedback",
      storage: gatedStorage,
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(useFeedbackStore),
      partialize: (state) => ({
        draft: state.draft,
        lastSentAt: state.lastSentAt,
        lastSentHash: state.lastSentHash,
      }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);

export function messageHash(message: string): string {
  let hash = 0;
  const trimmed = message.trim();
  for (let index = 0; index < trimmed.length; index += 1) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(index);
    hash |= 0;
  }
  return `${hash}`;
}

export function cooldownRemainingMs(lastSentAt: number, now: number): number {
  return Math.max(0, COOLDOWN_MS - (now - lastSentAt));
}

export function isDuplicateSend(
  state: { lastSentHash: string; lastSentAt: number },
  message: string,
  now: number,
): boolean {
  if (!state.lastSentHash) return false;
  if (state.lastSentHash !== messageHash(message)) return false;
  return now - state.lastSentAt < DUPLICATE_WINDOW_MS;
}
