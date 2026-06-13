import { useEffect, useRef } from "react";
import { useGithubStore } from "@/widgets/github/useGithubStore";

export function useGithubSync(refresh: () => void, isRefreshing: boolean): void {
  const syncNonce = useGithubStore((s) => s.syncNonce);
  const setSyncing = useGithubStore((s) => s.setSyncing);
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
}
