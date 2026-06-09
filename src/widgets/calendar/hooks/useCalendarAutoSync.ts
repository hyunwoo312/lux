import { useEffect } from "react";
import { useIntegrationStore } from "@/integrations";
import { useCalendarStore } from "@/widgets/calendar/useCalendarStore";

const PROVIDERS = ["google", "microsoft"] as const;

export function useCalendarAutoSync() {
  const refreshIntervalHours = useCalendarStore((s) => s.refreshIntervalHours);
  const connectedKey = useIntegrationStore((s) =>
    PROVIDERS.filter((providerId) =>
      s.accounts.some(
        (account) => account.providerId === providerId && account.status === "connected",
      ),
    ).join(","),
  );

  useEffect(() => {
    if (!connectedKey) return;
    const intervalMs = refreshIntervalHours * 60 * 60 * 1000;

    const maybeSync = () => {
      if (document.visibilityState !== "visible") return;
      const state = useCalendarStore.getState();
      const accounts = useIntegrationStore.getState().accounts;
      const isConnected = (providerId: (typeof PROVIDERS)[number]) =>
        accounts.some(
          (account) => account.providerId === providerId && account.status === "connected",
        );

      const stale = PROVIDERS.some((providerId) => {
        if (!isConnected(providerId)) return false;
        const lastSyncedAt = state[providerId].lastSyncedAt;
        return lastSyncedAt === undefined || Date.now() - new Date(lastSyncedAt).getTime() >= intervalMs;
      });
      if (stale) void state.sync();
    };

    maybeSync();
    const id = window.setInterval(maybeSync, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", maybeSync);
    window.addEventListener("focus", maybeSync);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", maybeSync);
      window.removeEventListener("focus", maybeSync);
    };
  }, [connectedKey, refreshIntervalHours]);
}
