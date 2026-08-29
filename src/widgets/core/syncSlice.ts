import { dropInstance } from "@/widgets/core/byInstance";
import { syncCooldownRemainingMs } from "@/widgets/core/syncCooldown";

export type SyncSliceState = {
  syncNonce: Record<string, number>;
  lastSyncAt: Record<string, number>;
  dataSyncedAt: Record<string, number>;
  syncing: Record<string, number>;
};

export type SyncSlice = SyncSliceState & {
  beginSync: (key: string) => void;
  endSync: (key: string) => void;
  reportSynced: (key: string, at: number) => void;
  dropSync: (key: string) => void;
};

type SyncSet = (updater: (state: SyncSliceState) => Partial<SyncSliceState>) => void;

export function createSyncSlice(set: SyncSet): SyncSlice {
  return {
    syncNonce: {},
    lastSyncAt: {},
    dataSyncedAt: {},
    syncing: {},
    beginSync: (key) =>
      set((state) => ({ syncing: { ...state.syncing, [key]: (state.syncing[key] ?? 0) + 1 } })),
    endSync: (key) =>
      set((state) => ({
        syncing: { ...state.syncing, [key]: Math.max(0, (state.syncing[key] ?? 0) - 1) },
      })),
    reportSynced: (key, at) =>
      set((state) =>
        at > (state.dataSyncedAt[key] ?? 0)
          ? { dataSyncedAt: { ...state.dataSyncedAt, [key]: at } }
          : state,
      ),
    dropSync: (key) =>
      set((state) => ({
        syncNonce: dropInstance(state.syncNonce, key),
        lastSyncAt: dropInstance(state.lastSyncAt, key),
        dataSyncedAt: dropInstance(state.dataSyncedAt, key),
        syncing: dropInstance(state.syncing, key),
      })),
  };
}

export function isSyncCoolingDown(state: SyncSliceState, key: string, cooldownMs: number): boolean {
  return syncCooldownRemainingMs(state.lastSyncAt[key], cooldownMs) > 0;
}

export function bumpSyncNonce(
  state: SyncSliceState,
  key: string,
): Pick<SyncSliceState, "syncNonce" | "lastSyncAt"> {
  return {
    syncNonce: { ...state.syncNonce, [key]: (state.syncNonce[key] ?? 0) + 1 },
    lastSyncAt: { ...state.lastSyncAt, [key]: Date.now() },
  };
}
