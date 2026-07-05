import { useEffect, useRef } from "react";
import { useStocksStore } from "@/widgets/stocks/useStocksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function useStocksSync(refresh: () => void, isRefreshing: boolean): void {
  const instanceId = useWidgetInstanceId();
  const syncNonce = useStocksStore((s) => s.syncNonce[instanceId] ?? 0);
  const beginSync = useStocksStore((s) => s.beginSync);
  const endSync = useStocksStore((s) => s.endSync);
  const lastNonce = useRef(syncNonce);

  useEffect(() => {
    if (syncNonce !== lastNonce.current) {
      lastNonce.current = syncNonce;
      refresh();
    }
  }, [syncNonce, refresh]);

  useEffect(() => {
    if (!isRefreshing) return;
    beginSync(instanceId);
    return () => endSync(instanceId);
  }, [instanceId, isRefreshing, beginSync, endSync]);
}
