import { useEffect } from "react";
import { connectedProviders, useConnectedProviders, useIntegrationStore } from "@/integrations";
import { refreshScheduler } from "@/widgets/core/refreshScheduler";
import {
  getCalendarData,
  useCalendar,
  useCalendarStore,
} from "@/widgets/calendar/useCalendarStore";
import { CALENDAR_PROVIDER_IDS } from "@/widgets/calendar/types";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

function oldestSyncedAt(instanceId: string): number {
  const data = getCalendarData(instanceId);
  const connected = connectedProviders(
    useIntegrationStore.getState().accounts,
    CALENDAR_PROVIDER_IDS,
  );
  if (connected.length === 0) return Date.now();
  let oldest = Number.POSITIVE_INFINITY;
  for (const providerId of connected) {
    oldest = Math.min(oldest, data[providerId].lastSyncedAt ?? 0);
  }
  return oldest;
}

export function useCalendarAutoSync() {
  const instanceId = useWidgetInstanceId();
  const refreshIntervalHours = useCalendar((d) => d.refreshIntervalHours);
  const { connected } = useConnectedProviders(CALENDAR_PROVIDER_IDS);
  const connectedKey = connected.join(",");

  useEffect(() => {
    if (!connectedKey) return;
    const staleMs = refreshIntervalHours * 60 * 60 * 1000;
    const refresh = () => void useCalendarStore.getState().sync(instanceId);

    if (
      document.visibilityState === "visible" &&
      Date.now() - oldestSyncedAt(instanceId) >= staleMs
    ) {
      refresh();
    }

    return refreshScheduler.register({
      id: `calendar:autosync:${instanceId}`,
      staleMs,
      pollIntervalMs: CHECK_INTERVAL_MS,
      getLastRefreshedAt: () => oldestSyncedAt(instanceId),
      refresh,
    });
  }, [connectedKey, refreshIntervalHours, instanceId]);
}
