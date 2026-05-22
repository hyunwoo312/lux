import { useCallback, useEffect, useState } from "react";
import { useIntegrationStore } from "@/integrations";
import { useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import type { CalendarProviderId } from "@/widgets/calendar/types";

type ConnectionBusy = "connecting" | "disconnecting" | null;

export function useCalendarConnection(providerId: CalendarProviderId) {
  const account = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === providerId) ?? null,
  );
  const loaded = useIntegrationStore((s) => s.loaded);
  const load = useIntegrationStore((s) => s.load);
  const connectAccount = useIntegrationStore((s) => s.connect);
  const disconnectAccount = useIntegrationStore((s) => s.disconnect);
  const sync = useCalendarStore((s) => s.sync);
  const clearIntegration = useCalendarStore((s) => s.clearIntegration);
  const hasStoredData = useCalendarStore((s) => s[providerId].calendars.length > 0);

  const [busy, setBusy] = useState<ConnectionBusy>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  useEffect(() => {
    if (loaded && !account && hasStoredData) clearIntegration(providerId);
  }, [loaded, account, hasStoredData, clearIntegration, providerId]);

  const connect = useCallback(async () => {
    setBusy("connecting");
    setError(null);
    try {
      await connectAccount(providerId);
      await sync({ bypassCooldown: true, providerId });
      const syncError = useCalendarStore.getState()[providerId].lastError;
      if (syncError) setError(syncError);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not connect the calendar");
    } finally {
      setBusy(null);
    }
  }, [connectAccount, sync, providerId]);

  const disconnect = useCallback(async () => {
    setBusy("disconnecting");
    setError(null);
    try {
      await disconnectAccount(providerId);
      clearIntegration(providerId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not disconnect the calendar");
    } finally {
      setBusy(null);
    }
  }, [disconnectAccount, clearIntegration, providerId]);

  return { account, loaded, busy, error, connect, disconnect };
}
