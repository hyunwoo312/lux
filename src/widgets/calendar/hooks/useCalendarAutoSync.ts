import { useEffect } from "react";
import { useIntegrationStore } from "@/integrations";
import { refreshScheduler } from "@/widgets/core/refreshScheduler";
import { getCalendarData, useCalendar, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const PROVIDERS = ["google", "microsoft"] as const;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

function connectedProviders(): readonly (typeof PROVIDERS)[number][] {
  const accounts = useIntegrationStore.getState().accounts;
  return PROVIDERS.filter((providerId) =>
    accounts.some((account) => account.providerId === providerId && account.status === "connected"),
  );
}

function oldestSyncedAt(instanceId: string): number {
  const data = getCalendarData(instanceId);
  const connected = connectedProviders();
  if (connected.length === 0) return Date.now();
  let oldest = Number.POSITIVE_INFINITY;
  for (const providerId of connected) {
    const lastSyncedAt = data[providerId].lastSyncedAt;
    oldest = Math.min(oldest, lastSyncedAt === undefined ? 0 : new Date(lastSyncedAt).getTime());
  }
  return oldest;
}

export function useCalendarAutoSync() {
  const instanceId = useWidgetInstanceId();
  const refreshIntervalHours = useCalendar((d) => d.refreshIntervalHours);
  const connectedKey = useIntegrationStore((s) =>
    PROVIDERS.filter((providerId) =>
      s.accounts.some(
        (account) => account.providerId === providerId && account.status === "connected",
      ),
    ).join(","),
  );

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
