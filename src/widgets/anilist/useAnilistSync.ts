import { useEffect, useRef } from "react";
import { useAnilistStore } from "@/widgets/anilist/useAnilistStore";

export function useAnilistSync(refresh: () => void, isRefreshing: boolean, syncedAt: number): void {
  const syncNonce = useAnilistStore((s) => s.syncNonce);
  const setSyncing = useAnilistStore((s) => s.setSyncing);
  const reportSynced = useAnilistStore((s) => s.reportSynced);
  const lastNonce = useRef(syncNonce);

  useEffect(() => {
    if (syncNonce !== lastNonce.current) {
      lastNonce.current = syncNonce;
      refresh();
    }
  }, [syncNonce, refresh]);

  useEffect(() => {
    setSyncing(isRefreshing);
    return () => setSyncing(false);
  }, [isRefreshing, setSyncing]);

  useEffect(() => {
    if (syncedAt > 0) reportSynced(syncedAt);
  }, [syncedAt, reportSynced]);
}
