import { useEffect, useRef } from "react";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useWeatherStore } from "@/widgets/weather/useWeatherStore";

export function useWeatherSync(refresh: () => void, isRefreshing: boolean): void {
  const instanceId = useWidgetInstanceId();
  const syncNonce = useWeatherStore((s) => s.syncNonce[instanceId] ?? 0);
  const beginSync = useWeatherStore((s) => s.beginSync);
  const endSync = useWeatherStore((s) => s.endSync);
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
