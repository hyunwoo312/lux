import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useCalendarConnection } from "@/widgets/calendar/hooks/useCalendarConnection";
import {
  CALENDAR_SYNC_COOLDOWN_MS,
  useCalendar,
  useCalendarStore,
} from "@/widgets/calendar/useCalendarStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function CalendarRefreshButton() {
  const instanceId = useWidgetInstanceId();
  const google = useCalendarConnection("google");
  const microsoft = useCalendarConnection("microsoft");
  const syncing = useCalendar((d) => d.syncing.length > 0);
  const googleSyncedAt = useCalendar((d) => d.google.lastSyncedAt);
  const microsoftSyncedAt = useCalendar((d) => d.microsoft.lastSyncedAt);
  const googleError = useCalendar((d) => d.google.lastError);
  const microsoftError = useCalendar((d) => d.microsoft.lastError);
  const sync = useCalendarStore((s) => s.sync);

  const connected =
    google.account?.status === "connected" || microsoft.account?.status === "connected";
  if (!connected) return null;

  const lastSyncAt = Math.max(googleSyncedAt ?? 0, microsoftSyncedAt ?? 0) || undefined;

  const syncError = googleError ?? microsoftError;

  return (
    <WidgetRefreshButton
      label="Calendar"
      staleSince={syncError ? (lastSyncAt ?? 0) : undefined}
      syncing={syncing}
      lastSyncAt={lastSyncAt}
      cooldownMs={CALENDAR_SYNC_COOLDOWN_MS}
      onRefresh={() => void sync(instanceId)}
    />
  );
}
