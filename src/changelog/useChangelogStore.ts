import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage, read, remove } from "@/lib/storage";

function readCurrentVersion(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return "0.0.0";
  }
}

const CURRENT_VERSION = readCurrentVersion();

type ChangelogState = {
  lastSeenVersion: string | null;
  markSeen: () => void;
};

const persistedSchema = z.object({ lastSeenVersion: z.string().nullable() }).partial();

const gatedStorage = createGatedChromeStorage();

export const useChangelogStore = create<ChangelogState>()(
  persist(
    (set) => ({
      lastSeenVersion: null,
      markSeen: () => set({ lastSeenVersion: CURRENT_VERSION }),
    }),
    {
      name: "changelog",
      storage: gatedStorage,
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({ lastSeenVersion: state.lastSeenVersion }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return { ...current, ...parsed.data };
      },
    },
  ),
);

export function useHasUnseenRelease(): boolean {
  return useChangelogStore(
    (state) => state.lastSeenVersion !== null && state.lastSeenVersion !== CURRENT_VERSION,
  );
}

export async function consumeChangelogAutoShow(): Promise<boolean> {
  const pending = await read("changelog-pending", z.string(), "");
  if (pending === "") return false;
  await remove("changelog-pending");
  return pending === CURRENT_VERSION;
}
