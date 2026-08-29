import { useEffect } from "react";
import { useProviderAccount } from "@/integrations";
import { useCalendar, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { CalendarProviderId } from "@/widgets/calendar/types";

export function useCalendarConnection(providerId: CalendarProviderId) {
  const instanceId = useWidgetInstanceId();
  const { account, loaded } = useProviderAccount(providerId);
  const clearIntegration = useCalendarStore((s) => s.clearIntegration);
  const hasStoredData = useCalendar((d) => d[providerId].calendars.length > 0);

  useEffect(() => {
    if (loaded && !account && hasStoredData) clearIntegration(instanceId, providerId);
  }, [loaded, account, hasStoredData, clearIntegration, providerId, instanceId]);

  return { account, loaded };
}
