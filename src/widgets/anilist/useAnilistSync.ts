import { useEffect, useRef } from "react";
import { useAnilistStore } from "@/widgets/anilist/useAnilistStore";

export function useAnilistSync(refresh: () => void, isRefreshing: boolean): void {
  const syncNonce = useAnilistStore((s) => s.syncNonce);
  const setSyncing = useAnilistStore((s) => s.setSyncing);
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
