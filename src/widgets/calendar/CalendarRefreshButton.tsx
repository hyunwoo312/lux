import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import type { Freshness } from "@/widgets/core/usePolledResource";
import { CALENDAR_SYNC_COOLDOWN_MS, toEpochMs } from "@/widgets/calendar/lib/cooldown";
import { useCalendarConnection } from "@/widgets/calendar/hooks/useCalendarConnection";
import { useCalendar, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
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

  const lastSyncAt =
    Math.max(toEpochMs(googleSyncedAt) ?? 0, toEpochMs(microsoftSyncedAt) ?? 0) || undefined;

  const syncError = googleError ?? microsoftError;
  const freshness: Freshness = syncError
    ? { status: "failing", error: new Error(syncError), failures: 1, since: lastSyncAt ?? 0 }
    : { status: "current" };

  return (
    <WidgetRefreshButton
      label="Calendar"
      freshness={freshness}
      syncing={syncing}
      lastSyncAt={lastSyncAt}
      cooldownMs={CALENDAR_SYNC_COOLDOWN_MS}
      onRefresh={() => void sync(instanceId)}
    />
  );
}
