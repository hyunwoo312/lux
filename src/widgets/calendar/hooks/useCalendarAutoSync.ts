import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  accountFor,
  connectedProviders,
  useConnectedProviders,
  useIntegrationStore,
} from "@/integrations";
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
  const clearIntegration = useCalendarStore((s) => s.clearIntegration);
  const { connected, loaded } = useConnectedProviders(CALENDAR_PROVIDER_IDS);
  const unreadable = useIntegrationStore((state) => state.unreadable);
  const connectedKey = useIntegrationStore((state) =>
    connected.map((id) => accountFor(state.accounts, id)?.id ?? "").join(","),
  );
  const signedOut = useIntegrationStore(
    useShallow((s) => CALENDAR_PROVIDER_IDS.filter((id) => !accountFor(s.accounts, id))),
  );
  const stored = useCalendar(
    useShallow((d) =>
      CALENDAR_PROVIDER_IDS.filter(
        (id) => d[id].calendars.length > 0 || d[id].accountId !== undefined,
      ),
    ),
  );

  useEffect(() => {
    if (!loaded || unreadable) return;
    for (const providerId of stored) {
      const accountId = accountFor(useIntegrationStore.getState().accounts, providerId)?.id;
      if (
        signedOut.includes(providerId) ||
        getCalendarData(instanceId)[providerId].accountId !== accountId
      )
        clearIntegration(instanceId, providerId);
    }
  }, [loaded, unreadable, signedOut, stored, connectedKey, clearIntegration, instanceId]);

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
      clearBackoff: () => useCalendarStore.getState().clearRetry(instanceId),
    });
  }, [connectedKey, refreshIntervalHours, instanceId]);
}
