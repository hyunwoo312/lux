import { useEffect } from "react";
import { useIntegrationStore } from "@/integrations";
import { useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import type { CalendarProviderId } from "@/widgets/calendar/types";

export function useCalendarConnection(providerId: CalendarProviderId) {
  const account = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === providerId) ?? null,
  );
  const loaded = useIntegrationStore((s) => s.loaded);
  const load = useIntegrationStore((s) => s.load);
  const clearIntegration = useCalendarStore((s) => s.clearIntegration);
  const hasStoredData = useCalendarStore((s) => s[providerId].calendars.length > 0);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  useEffect(() => {
    if (loaded && !account && hasStoredData) clearIntegration(providerId);
  }, [loaded, account, hasStoredData, clearIntegration, providerId]);

  return { account, loaded };
}
