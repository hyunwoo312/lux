import { useEffect, useRef } from "react";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useWeatherStore } from "@/widgets/weather/useWeatherStore";

export function useWeatherSync(refresh: () => void, isRefreshing: boolean): void {
  const instanceId = useWidgetInstanceId();
  const syncNonce = useWeatherStore((s) => s.syncNonce[instanceId] ?? 0);
  const setSyncing = useWeatherStore((s) => s.setSyncing);
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
