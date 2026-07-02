import { useEffect, useRef } from "react";
import { useStocksStore } from "@/widgets/stocks/useStocksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function useStocksSync(refresh: () => void, isRefreshing: boolean): void {
  const instanceId = useWidgetInstanceId();
  const syncNonce = useStocksStore((s) => s.syncNonce[instanceId] ?? 0);
  const setSyncing = useStocksStore((s) => s.setSyncing);
  const lastNonce = useRef(syncNonce);

  useEffect(() => {
    if (syncNonce !== lastNonce.current) {
      lastNonce.current = syncNonce;
      refresh();
    }
  }, [syncNonce, refresh]);

  useEffect(() => {
    setSyncing(instanceId, isRefreshing);
    return () => setSyncing(instanceId, false);
  }, [instanceId, isRefreshing, setSyncing]);
}
