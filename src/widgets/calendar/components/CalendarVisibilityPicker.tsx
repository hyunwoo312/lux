import { useMemo, useState } from "react";
import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { useIntegrationStore } from "@/integrations";
import { cn } from "@/lib/utils";
import { useCalendar, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/chromeStyles";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { CalendarProviderId, ConnectedCalendar } from "@/widgets/calendar/types";

const FALLBACK_COLOR = "var(--primary)";

const PROVIDER_LABELS: Record<CalendarProviderId, string> = {
  google: "Google",
  microsoft: "Outlook",
};

type PickerEntry = {
  calendar: ConnectedCalendar;
  enabled: boolean;
};

type PickerGroup = {
  providerId: CalendarProviderId;
  entries: PickerEntry[];
};

function buildGroup(
  providerId: CalendarProviderId,
  calendars: ConnectedCalendar[],
  enabledIds: string[],
): PickerGroup {
  return {
    providerId,
    entries: calendars.map((calendar) => ({
      calendar,
      enabled: enabledIds.includes(calendar.id),
    })),
  };
}

export function CalendarVisibilityPicker() {
  const instanceId = useWidgetInstanceId();
  const [open, setOpen] = useState(false);
  const connected = useIntegrationStore((s) =>
    s.accounts.some(
      (account) =>
        (account.providerId === "google" || account.providerId === "microsoft") &&
        account.status === "connected",
    ),
  );
  const googleCalendars = useCalendar((d) => d.google.calendars);
  const googleEnabled = useCalendar((d) => d.google.enabledCalendarIds);
  const microsoftCalendars = useCalendar((d) => d.microsoft.calendars);
  const microsoftEnabled = useCalendar((d) => d.microsoft.enabledCalendarIds);
  const setCalendarSelection = useCalendarStore((s) => s.setCalendarSelection);
  const sync = useCalendarStore((s) => s.sync);

  const groups = useMemo(
    () =>
      [
        buildGroup("google", googleCalendars, googleEnabled),
        buildGroup("microsoft", microsoftCalendars, microsoftEnabled),
      ].filter((group) => group.entries.length > 0),
    [googleCalendars, googleEnabled, microsoftCalendars, microsoftEnabled],
  );

  const hiddenCount = groups.reduce(
    (total, group) => total + group.entries.filter((entry) => !entry.enabled).length,
    0,
  );

  if (!connected || groups.length === 0) return null;

  const label =
    hiddenCount > 0 ? `Choose calendars, ${hiddenCount} hidden` : "Choose calendars, all shown";

  const toggle = (providerId: CalendarProviderId, calendarId: string, selected: boolean) => {
    setCalendarSelection(instanceId, providerId, calendarId, selected);
    void sync(instanceId, { bypassCooldown: true, providerId });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip content={label} sticky>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className={cn(WIDGET_HEADER_ACTION, "relative")}
            aria-label={label}
          >
            <ListFilter />
            {hiddenCount > 0 && (
              <span
                aria-hidden
                className="bg-primary absolute top-0.5 right-0.5 size-1.5 rounded-full"
              />
            )}
          </Button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="end" padding="none" className="w-60">
        <div className="scroll-fade max-h-64 overflow-y-auto p-1">
          {groups.map((group) => (
            <div key={group.providerId} className="flex flex-col">
              {groups.length > 1 && (
                <p className="text-ink-3 px-2 pt-1.5 pb-1 text-micro font-medium">
                  {PROVIDER_LABELS[group.providerId]}
                </p>
              )}
              {group.entries.map(({ calendar, enabled }) => {
                const controlId = `${instanceId}-${group.providerId}-${calendar.id}`;
                return (
                  <label
                    key={calendar.id}
                    htmlFor={controlId}
                    className="
                      press text-caption
                      hover:bg-accent
                      flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5
                    "
                  >
                    <span
                      aria-hidden
                      className={cn("size-2 flex-none rounded-full", !enabled && "opacity-40")}
                      style={{ backgroundColor: calendar.backgroundColor ?? FALLBACK_COLOR }}
                    />
                    <span className="text-ink min-w-0 flex-1 truncate">{calendar.summary}</span>
                    <Checkbox
                      id={controlId}
                      checked={enabled}
                      aria-label={calendar.summary}
                      onCheckedChange={(checked) =>
                        toggle(group.providerId, calendar.id, checked === true)
                      }
                    />
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
