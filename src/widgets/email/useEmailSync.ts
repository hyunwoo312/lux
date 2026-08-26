import { useEffect, useRef } from "react";
import { useEmailStore } from "@/widgets/email/useEmailStore";

export function useEmailSync(refresh: () => void, isRefreshing: boolean, syncedAt: number): void {
  const syncNonce = useEmailStore((s) => s.syncNonce);
  const setSyncing = useEmailStore((s) => s.setSyncing);
  const reportSynced = useEmailStore((s) => s.reportSynced);
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
