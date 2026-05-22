import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useIntegrationStore } from "@/integrations";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ConfigSelect,
  WidgetConfigGroup,
  WidgetConfigItem,
  WidgetConfigSubItem,
} from "@/widgets/core/WidgetConfig";
import { useCalendarConnection } from "@/widgets/calendar/hooks/useCalendarConnection";
import {
  getCalendarSyncCooldownMessage,
  isCalendarSyncCoolingDown,
} from "@/widgets/calendar/lib/cooldown";
import { REFRESH_INTERVAL_OPTIONS, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import type { CalendarProviderId } from "@/widgets/calendar/types";

const REFRESH_OPTIONS = REFRESH_INTERVAL_OPTIONS.map((hours) => ({
  value: String(hours),
  label: `Every ${hours} hours`,
}));

const SOURCE_OPTIONS: { value: CalendarProviderId; label: string }[] = [
  { value: "google", label: "Google" },
  { value: "microsoft", label: "Outlook" },
];

function formatLastSynced(value: string | undefined): string | null {
  if (!value) return null;
  return `Last synced ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
  const { account, busy, error: connectionError, connect, disconnect } =
    useCalendarConnection(providerId);
  const settings = useCalendarStore((s) => s[providerId]);
  const sync = useCalendarStore((s) => s.sync);
  const setCalendarSelection = useCalendarStore((s) => s.setCalendarSelection);
  const isSyncing = useCalendarStore((s) => s.syncing.includes(providerId));

  const [now, setNow] = useState(() => Date.now());
  const connected = Boolean(account);
  const needsReconnect = account?.status === "needsReconnect";
  const coolingDown = connected && isCalendarSyncCoolingDown(settings.lastSyncedAt, now);

  useEffect(() => {
    if (!coolingDown) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [coolingDown]);

  const syncDisabled = isSyncing || busy !== null || coolingDown;
  const syncTooltip = coolingDown
    ? getCalendarSyncCooldownMessage(settings.lastSyncedAt, now)
    : "Sync now";
  const lastSyncedLabel = formatLastSynced(settings.lastSyncedAt);
  const providerNote = connected
    ? getProviderNote(settings.calendars.length, settings.enabledCalendarIds.length)
    : null;
  const error = connectionError ?? settings.lastError ?? null;
  const description = needsReconnect
    ? "Reconnect to resume syncing."
    : (account?.email ?? account?.displayName ?? "Connect to sync your events.");

  const handleCalendarToggle = (calendarId: string, checked: boolean) => {
    setCalendarSelection(providerId, calendarId, checked);
    void sync({ bypassCooldown: true, providerId });
  };

  return (
    <WidgetConfigGroup label={label}>
      <WidgetConfigItem
        title={label}
        description={description}
        control={
          connected ? undefined : (
            <Button size="sm" onClick={connect} disabled={busy === "connecting"}>
              {busy === "connecting" ? "Connecting…" : "Connect"}
            </Button>
          )
        }
      >
        {connected && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {needsReconnect ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={connect}
                  disabled={busy === "connecting"}
                >
                  {busy === "connecting" ? "Reconnecting…" : "Reconnect"}
                </Button>
              ) : (
                <>
                  <Tooltip content={syncTooltip}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void sync({ providerId })}
                      disabled={syncDisabled}
                      aria-label={`Sync ${label}`}
                    >
                      <RefreshCw className={cn(isSyncing && "animate-spin")} />
                      Sync
                    </Button>
                  </Tooltip>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={disconnect}
                    disabled={busy === "disconnecting"}
                  >
                    {busy === "disconnecting" ? "Disconnecting…" : "Disconnect"}
                  </Button>
                </>
              )}
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
        )}
      </WidgetConfigItem>
    </WidgetConfigGroup>
  );
}

export function CalendarConfig() {
  const enabled = useCalendarStore((s) => s.enabled);
  const setEnabled = useCalendarStore((s) => s.setEnabled);
  const refreshIntervalHours = useCalendarStore((s) => s.refreshIntervalHours);
  const setRefreshIntervalHours = useCalendarStore((s) => s.setRefreshIntervalHours);
  const primarySource = useCalendarStore((s) => s.primarySource);
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
              onCheckedChange={(checked) => setEnabled(checked === true)}
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
              onChange={(value) => setRefreshIntervalHours(Number(value))}
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
                onChange={setPrimarySource}
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
