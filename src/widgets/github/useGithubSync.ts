import { useEffect, useRef } from "react";
import { useGithubStore } from "@/widgets/github/useGithubStore";

export function useGithubSync(refresh: () => void, isRefreshing: boolean, syncedAt: number): void {
  const syncNonce = useGithubStore((s) => s.syncNonce);
  const setSyncing = useGithubStore((s) => s.setSyncing);
  const reportSynced = useGithubStore((s) => s.reportSynced);
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
