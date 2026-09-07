import { z } from "zod";
import { createPersistedStore, read, remove } from "@/lib/storage";

function readCurrentVersion(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return "0.0.0";
  }
}

const CURRENT_VERSION = readCurrentVersion();

type ChangelogState = {
  open: boolean;
  lastSeenVersion: string | null;
  setOpen: (open: boolean) => void;
  markSeen: () => void;
  reset: () => void;
};

const persistedSchema = z.object({ lastSeenVersion: z.string().nullable().catch(null) });

export const useChangelogStore = createPersistedStore<ChangelogState>()(
  (set) => ({
    open: false,
    lastSeenVersion: null,
    setOpen: (open) => set({ open }),
    markSeen: () => set({ lastSeenVersion: CURRENT_VERSION }),
    reset: () => set({ lastSeenVersion: null }),
  }),
  {
    name: "changelog",
    partialize: (state) => ({ lastSeenVersion: state.lastSeenVersion }),
    schema: persistedSchema,
    build: (parsed, current) => ({
      ...current,
      ...parsed,
    }),
  },
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
