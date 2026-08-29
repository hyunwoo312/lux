import { useEffect, useRef } from "react";
import type { SyncSlice } from "@/widgets/core/syncSlice";

export type SyncStatus = {
  syncing: boolean;
  lastSyncAt: number | undefined;
  updatedAt: number | undefined;
};

export type WidgetSync = {
  useSync: (refresh: () => void, isRefreshing: boolean, syncedAt: number) => void;
  useSyncStatus: () => SyncStatus;
};

export function createWidgetSync<S extends SyncSlice>(
  useStore: <T>(selector: (state: S) => T) => T,
  useSyncKey: () => string,
): WidgetSync {
  function useSync(refresh: () => void, isRefreshing: boolean, syncedAt: number): void {
    const key = useSyncKey();
    const syncNonce = useStore((s) => s.syncNonce[key] ?? 0);
    const beginSync = useStore((s) => s.beginSync);
    const endSync = useStore((s) => s.endSync);
    const reportSynced = useStore((s) => s.reportSynced);
    const lastNonce = useRef(syncNonce);

    useEffect(() => {
      if (syncNonce !== lastNonce.current) {
        lastNonce.current = syncNonce;
        refresh();
      }
    }, [syncNonce, refresh]);

    useEffect(() => {
      if (!isRefreshing) return;
      beginSync(key);
      return () => endSync(key);
    }, [key, isRefreshing, beginSync, endSync]);

    useEffect(() => {
      if (syncedAt > 0) reportSynced(key, syncedAt);
    }, [key, syncedAt, reportSynced]);
  }

  function useSyncStatus(): SyncStatus {
    const key = useSyncKey();
    const syncing = useStore((s) => (s.syncing[key] ?? 0) > 0);
    const lastSyncAt = useStore((s) => s.lastSyncAt[key]);
    const updatedAt = useStore((s) => s.dataSyncedAt[key]);
    return { syncing, lastSyncAt, updatedAt };
  }

  return { useSync, useSyncStatus };
}
