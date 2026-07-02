import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { CALENDAR_SYNC_COOLDOWN_MS } from "@/widgets/calendar/lib/cooldown";
import { useCalendarConnection } from "@/widgets/calendar/hooks/useCalendarConnection";
import { useCalendar, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

function toEpoch(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const time = new Date(iso).getTime();
  return Number.isFinite(time) ? time : undefined;
}

export function CalendarRefreshButton() {
  const instanceId = useWidgetInstanceId();
  const google = useCalendarConnection("google");
  const microsoft = useCalendarConnection("microsoft");
  const syncing = useCalendar((d) => d.syncing.length > 0);
  const googleSyncedAt = useCalendar((d) => d.google.lastSyncedAt);
  const microsoftSyncedAt = useCalendar((d) => d.microsoft.lastSyncedAt);
  const sync = useCalendarStore((s) => s.sync);

  const connected =
    google.account?.status === "connected" || microsoft.account?.status === "connected";
  if (!connected) return null;

  const lastSyncAt =
    Math.max(toEpoch(googleSyncedAt) ?? 0, toEpoch(microsoftSyncedAt) ?? 0) || undefined;

  return (
    <WidgetRefreshButton
      syncing={syncing}
      lastSyncAt={lastSyncAt}
      cooldownMs={CALENDAR_SYNC_COOLDOWN_MS}
      onRefresh={() => void sync(instanceId)}
    />
  );
}
