import { RefreshCw, Settings2 } from "lucide-react";
import { formatClock } from "@/lib/clock";
import { useConnectedProviders, useProviderAccount } from "@/integrations";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { IconActionButton } from "@/components/IconActionButton";
import { Switch } from "@/components/ui/switch";
import {
  ConfigSegmented,
  ConfigSelect,
  ConfigSection,
  ConfigRow,
  ConfigSubRow,
} from "@/components/config/Config";
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
  CALENDAR_PROVIDER_LABEL,
  type CalendarDensity,
  type CalendarProviderId,
} from "@/widgets/calendar/types";
import { useNow } from "@/hooks/useNow";

const REFRESH_OPTIONS = REFRESH_INTERVAL_OPTIONS.map((hours) => ({
  value: String(hours),
  label: `Every ${hours} hours`,
}));

const DENSITY_OPTIONS: { value: CalendarDensity; label: string }[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

const SOURCE_OPTIONS = CALENDAR_PROVIDER_IDS.map((value) => ({
  value,
  label: CALENDAR_PROVIDER_LABEL[value],
}));

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

function CalendarProviderConfig({ providerId }: { providerId: CalendarProviderId }) {
  const label = CALENDAR_PROVIDER_LABEL[providerId];
  const instanceId = useWidgetInstanceId();
  const { account } = useProviderAccount(providerId);
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const settings = useCalendar((d) => d[providerId]);
  const sync = useCalendarStore((s) => s.sync);
  const setCalendarSelection = useCalendarStore((s) => s.setCalendarSelection);
  const isSyncing = useCalendar((d) => d.syncing.includes(providerId));

  const connected = Boolean(account);
  const needsReconnect = account?.status === "needsReconnect";
  const remainingAt = (at: number) =>
    connected && !needsReconnect
      ? syncCooldownRemainingMs(settings.lastSyncedAt, CALENDAR_SYNC_COOLDOWN_MS, at)
      : 0;
  const coolingDown = remainingAt(Date.now()) > 0;
  const now = useNow(coolingDown ? 1000 : 60_000).getTime();
  const cooldownRemainingMs = remainingAt(now);

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
      <ConfigSection title={label}>
        <ConfigRow title={label} description={description} control={manageButton} />
      </ConfigSection>
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
    <ConfigSection title={label}>
      <ConfigRow title={label} description={description} control={manageButton}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <IconActionButton
              icon={RefreshCw}
              label={`Sync ${label}`}
              tooltip={syncTooltip}
              onClick={() => void sync(instanceId, { providerId })}
              disabled={syncDisabled}
              pending={isSyncing}
            />
            {lastSyncedLabel && (
              <span className="text-ink-3 text-micro ml-auto">{lastSyncedLabel}</span>
            )}
          </div>

          {error && <p className="text-destructive text-micro">{error}</p>}

          {settings.calendars.length > 0 && (
            <div className="flex flex-col gap-3">
              {settings.calendars.map((calendar) => (
                <ConfigSubRow
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
      </ConfigRow>
    </ConfigSection>
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
      <ConfigSection title="Calendar">
        <ConfigRow
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
        <ConfigRow
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
        <ConfigRow
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
          <ConfigRow
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
      </ConfigSection>

      {CALENDAR_PROVIDER_IDS.map((providerId) => (
        <CalendarProviderConfig key={providerId} providerId={providerId} />
      ))}
    </>
  );
}
