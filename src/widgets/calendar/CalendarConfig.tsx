import { useEffect, useState } from "react";
import { RefreshCw, Settings2 } from "lucide-react";
import { useIntegrationStore } from "@/integrations";
import { useSettingsStore } from "@/settings";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { IconActionButton } from "@/components/IconActionButton";
import { Switch } from "@/components/ui/switch";
import {
  ConfigSelect,
  WidgetConfigGroup,
  WidgetConfigItem,
  WidgetConfigSubItem,
} from "@/components/config/WidgetConfig";
import { useCalendarConnection } from "@/widgets/calendar/hooks/useCalendarConnection";
import {
  getCalendarSyncCooldownMessage,
  isCalendarSyncCoolingDown,
} from "@/widgets/calendar/lib/cooldown";
import {
  REFRESH_INTERVAL_OPTIONS,
  useCalendar,
  useCalendarStore,
} from "@/widgets/calendar/useCalendarStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { CalendarProviderId } from "@/widgets/calendar/types";

const REFRESH_OPTIONS = REFRESH_INTERVAL_OPTIONS.map((hours) => ({
  value: String(hours),
  label: `Every ${hours} hours`,
}));

const SOURCE_OPTIONS: { value: CalendarProviderId; label: string }[] = [
  { value: "google", label: "Google" },
  { value: "microsoft", label: "Outlook" },
];

function formatLastSynced(value: string | undefined, hour12: boolean): string | null {
  if (!value) return null;
  return `Last synced ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  }).format(new Date(value))}`;
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
  const coolingDown =
    connected && !needsReconnect && isCalendarSyncCoolingDown(settings.lastSyncedAt, now);

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
  const syncTooltip = coolingDown
    ? getCalendarSyncCooldownMessage(settings.lastSyncedAt, now)
    : "Sync now";
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
              <span className="text-muted-foreground/70 text-2xs ml-auto">{lastSyncedLabel}</span>
            )}
          </div>

          {error && <p className="text-destructive text-2xs">{error}</p>}

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

          {providerNote && <p className="text-muted-foreground/70 text-2xs">{providerNote}</p>}
        </div>
      </WidgetConfigItem>
    </WidgetConfigGroup>
  );
}

export function CalendarConfig() {
  const instanceId = useWidgetInstanceId();
  const enabled = useCalendar((d) => d.enabled);
  const setEnabled = useCalendarStore((s) => s.setEnabled);
  const refreshIntervalHours = useCalendar((d) => d.refreshIntervalHours);
  const setRefreshIntervalHours = useCalendarStore((s) => s.setRefreshIntervalHours);
  const primarySource = useCalendar((d) => d.primarySource);
  const setPrimarySource = useCalendarStore((s) => s.setPrimarySource);
  const accounts = useIntegrationStore((s) => s.accounts);

  const bothConnected = (["google", "microsoft"] as const).every((providerId) =>
    accounts.some((account) => account.providerId === providerId && account.status === "connected"),
  );

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
