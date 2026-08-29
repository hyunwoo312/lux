import { useEffect, useState } from "react";
import { RefreshCw, Settings2 } from "lucide-react";
import { formatClock } from "@/lib/clock";
import { useConnectedProviders } from "@/integrations";
import { useSettingsStore } from "@/settings";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { IconActionButton } from "@/components/IconActionButton";
import { Switch } from "@/components/ui/switch";
import {
  ConfigSegmented,
  ConfigSelect,
  WidgetConfigGroup,
  WidgetConfigItem,
  WidgetConfigSubItem,
} from "@/components/config/WidgetConfig";
import { useCalendarConnection } from "@/widgets/calendar/hooks/useCalendarConnection";
import { syncCooldownMessage, syncCooldownRemainingMs } from "@/widgets/core/syncCooldown";
import {
  CALENDAR_SYNC_COOLDOWN_MS,
  REFRESH_INTERVAL_OPTIONS,
  useCalendar,
  useCalendarStore,
} from "@/widgets/calendar/useCalendarStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import {
  CALENDAR_PROVIDER_IDS,
  type CalendarDensity,
  type CalendarProviderId,
} from "@/widgets/calendar/types";

const REFRESH_OPTIONS = REFRESH_INTERVAL_OPTIONS.map((hours) => ({
  value: String(hours),
  label: `Every ${hours} hours`,
}));

const DENSITY_OPTIONS: { value: CalendarDensity; label: string }[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

const SOURCE_OPTIONS: { value: CalendarProviderId; label: string }[] = [
  { value: "google", label: "Google" },
  { value: "microsoft", label: "Outlook" },
];

function formatLastSynced(value: number | undefined, hour12: boolean): string | null {
  if (value === undefined) return null;
  const date = new Date(value);
  const day = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  return `Last synced ${day}, ${formatClock(date, hour12)}`;
}

function getProviderNote(calendarCount: number, enabledCount: number): string | null {
  if (!calendarCount) return "Sync to load your calendars.";
  if (!enabledCount) return "Select at least one calendar to show events.";
  return null;
}

function CalendarProviderConfig({
  providerId,
  label,
}: {
  providerId: CalendarProviderId;
  label: string;
}) {
  const instanceId = useWidgetInstanceId();
  const { account } = useCalendarConnection(providerId);
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const settings = useCalendar((d) => d[providerId]);
  const sync = useCalendarStore((s) => s.sync);
  const setCalendarSelection = useCalendarStore((s) => s.setCalendarSelection);
  const isSyncing = useCalendar((d) => d.syncing.includes(providerId));

  const [now, setNow] = useState(() => Date.now());
  const connected = Boolean(account);
  const needsReconnect = account?.status === "needsReconnect";
  const cooldownRemainingMs =
    connected && !needsReconnect
      ? syncCooldownRemainingMs(settings.lastSyncedAt, CALENDAR_SYNC_COOLDOWN_MS, now)
      : 0;
  const coolingDown = cooldownRemainingMs > 0;

  useEffect(() => {
    if (!coolingDown) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [coolingDown]);

  const manageButton = (
    <IconActionButton
      icon={Settings2}
      label="Manage account"
      tooltip="Manage account"
      onClick={() => useSettingsStore.getState().openSettings("accounts")}
    />
  );

  const description = needsReconnect
    ? "Reconnect to resume syncing."
    : connected
      ? (account?.email ?? account?.displayName ?? "Connected")
      : "Connect to sync your events.";

  if (!connected || needsReconnect) {
    return (
      <WidgetConfigGroup label={label}>
        <WidgetConfigItem title={label} description={description} control={manageButton} />
      </WidgetConfigGroup>
    );
  }

  const syncDisabled = isSyncing || coolingDown;
  const syncTooltip = coolingDown ? syncCooldownMessage(cooldownRemainingMs) : "Sync now";
  const lastSyncedLabel = formatLastSynced(settings.lastSyncedAt, !clock24h);
  const providerNote = getProviderNote(
    settings.calendars.length,
    settings.enabledCalendarIds.length,
  );
  const error = settings.lastError ?? null;

  const handleCalendarToggle = (calendarId: string, checked: boolean) => {
    setCalendarSelection(instanceId, providerId, calendarId, checked);
    void sync(instanceId, { bypassCooldown: true, providerId });
  };

  return (
    <WidgetConfigGroup label={label}>
      <WidgetConfigItem title={label} description={description} control={manageButton}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <IconActionButton
              icon={RefreshCw}
              label={`Sync ${label}`}
              tooltip={syncTooltip}
              onClick={() => void sync(instanceId, { providerId })}
              disabled={syncDisabled}
              spinning={isSyncing}
            />
            {lastSyncedLabel && (
              <span className="text-ink-3 text-micro ml-auto">{lastSyncedLabel}</span>
            )}
          </div>

          {error && <p className="text-destructive text-micro">{error}</p>}

          {settings.calendars.length > 0 && (
            <div className="flex flex-col gap-3">
              {settings.calendars.map((calendar) => (
                <WidgetConfigSubItem
                  key={calendar.id}
                  title={calendar.summary}
                  description={
                    settings.failedCalendarIds.includes(calendar.id)
                      ? "Sync failed"
                      : calendar.primary
                        ? "Primary calendar"
                        : undefined
                  }
                  disabled={isSyncing}
                  control={
                    <Switch
                      checked={settings.enabledCalendarIds.includes(calendar.id)}
                      onCheckedChange={(checked) =>
                        handleCalendarToggle(calendar.id, checked === true)
                      }
                      aria-label={`Show ${calendar.summary}`}
                    />
                  }
                />
              ))}
            </div>
          )}

          {providerNote && <p className="text-ink-3 text-micro">{providerNote}</p>}
        </div>
      </WidgetConfigItem>
    </WidgetConfigGroup>
  );
}

export function CalendarConfig() {
  const instanceId = useWidgetInstanceId();
  const enabled = useCalendar((d) => d.enabled);
  const setEnabled = useCalendarStore((s) => s.setEnabled);
  const density = useCalendar((d) => d.density);
  const setDensity = useCalendarStore((s) => s.setDensity);
  const refreshIntervalHours = useCalendar((d) => d.refreshIntervalHours);
  const setRefreshIntervalHours = useCalendarStore((s) => s.setRefreshIntervalHours);
  const primarySource = useCalendar((d) => d.primarySource);
  const setPrimarySource = useCalendarStore((s) => s.setPrimarySource);
  const { connected } = useConnectedProviders(CALENDAR_PROVIDER_IDS);

  const bothConnected = connected.length === CALENDAR_PROVIDER_IDS.length;

  return (
    <>
      <WidgetConfigGroup label="Calendar">
        <WidgetConfigItem
          title="Show events"
          description="Display events from connected calendars"
          control={
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(instanceId, checked === true)}
              aria-label="Show calendar events"
            />
          }
        />
        <WidgetConfigItem
          title="Timeline density"
          description="How much height each hour takes in the agenda timeline"
          control={
            <ConfigSegmented
              label="Timeline density"
              value={density}
              options={DENSITY_OPTIONS}
              onChange={(value) => setDensity(instanceId, value)}
            />
          }
        />
        <WidgetConfigItem
          title="Auto-refresh"
          description="How often events sync in the background"
          control={
            <ConfigSelect
              label="Auto-refresh interval"
              value={String(refreshIntervalHours)}
              options={REFRESH_OPTIONS}
              onChange={(value) => setRefreshIntervalHours(instanceId, Number(value))}
            />
          }
        />
        {bothConnected && (
          <WidgetConfigItem
            title="Primary source"
            description="Which copy to keep for events in both calendars"
            control={
              <ConfigSelect
                label="Primary calendar source"
                value={primarySource}
                options={SOURCE_OPTIONS}
                onChange={(value) => setPrimarySource(instanceId, value)}
              />
            }
          />
        )}
      </WidgetConfigGroup>

      <CalendarProviderConfig providerId="google" label="Google Calendar" />
      <CalendarProviderConfig providerId="microsoft" label="Outlook Calendar" />
    </>
  );
}
