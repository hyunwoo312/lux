import { useMemo } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { CalendarOff, CalendarPlus } from "lucide-react";
import { useSettingsStore } from "@/settings";
import { CalendarConnectPrompt } from "@/widgets/calendar/components/CalendarConnectPrompt";
import { CalendarGrid } from "@/widgets/calendar/CalendarGrid";
import { CalendarListView } from "@/widgets/calendar/CalendarListView";
import { useWidgetChrome } from "@/widgets/core/useWidgetChrome";
import { useCalendarAutoSync } from "@/widgets/calendar/hooks/useCalendarAutoSync";
import { useCalendarConnection } from "@/widgets/calendar/hooks/useCalendarConnection";
import { dedupeCalendarEvents } from "@/widgets/calendar/lib/agenda";
import { buildCalendarColorMap } from "@/widgets/calendar/lib/colors";
import { useCalendar } from "@/widgets/calendar/useCalendarStore";
import { EASE_OUT_QUINT } from "@/lib/motion";

export function CalendarWidget() {
  const reduced = useReducedMotion();
  const google = useCalendarConnection("google");
  const microsoft = useCalendarConnection("microsoft");
  const events = useCalendar((d) => d.events);
  const enabled = useCalendar((d) => d.enabled);
  const view = useCalendar((d) => d.view);
  const mode = useCalendar((d) => d.mode);
  const status = useCalendar((d) => d.status);
  const primarySource = useCalendar((d) => d.primarySource);
  const googleCalendars = useCalendar((d) => d.google.calendars);
  const microsoftCalendars = useCalendar((d) => d.microsoft.calendars);
  const googleError = useCalendar((d) => d.google.lastError);
  const microsoftError = useCalendar((d) => d.microsoft.lastError);
  const enabledCalendarCount = useCalendar(
    (d) => d.google.enabledCalendarIds.length + d.microsoft.enabledCalendarIds.length,
  );

  const { openConfig } = useWidgetChrome();
  const hasAccount = Boolean(google.account || microsoft.account);
  const connected =
    google.account?.status === "connected" || microsoft.account?.status === "connected";
  useCalendarAutoSync();

  const visibleEvents = useMemo(
    () => (enabled ? dedupeCalendarEvents(events, primarySource) : []),
    [events, enabled, primarySource],
  );
  const colors = useMemo(
    () => buildCalendarColorMap([...googleCalendars, ...microsoftCalendars]),
    [googleCalendars, microsoftCalendars],
  );

  const loaded = google.loaded;
  const syncError = status === "error" ? (googleError ?? microsoftError ?? null) : null;

  if (loaded && !connected) {
    return (
      <CalendarConnectPrompt
        icon={CalendarPlus}
        message={
          hasAccount
            ? "Reconnect your calendar to see your schedule."
            : "Connect a calendar to see your schedule."
        }
        actionLabel={hasAccount ? "Reconnect" : "Connect"}
        onAction={() => useSettingsStore.getState().openSettings("accounts")}
      />
    );
  }

  if (loaded && connected && status === "idle" && (!enabled || enabledCalendarCount === 0)) {
    return (
      <CalendarConnectPrompt
        icon={CalendarOff}
        message={
          enabled
            ? "No calendars selected for this widget."
            : "Events are turned off for this widget."
        }
        actionLabel="Open widget settings"
        onAction={openConfig}
      />
    );
  }

  const slide = !reduced && mode === "month";
  const transition = { duration: reduced ? 0 : 0.3, ease: EASE_OUT_QUINT };

  return (
    <LayoutGroup>
      <div className="relative h-full min-h-0">
        <AnimatePresence initial={false} mode="popLayout">
          {view === "list" ? (
            <motion.div
              key="list"
              className="absolute inset-0"
              initial={{ opacity: 0, y: slide ? "4%" : 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: slide ? "4%" : 0 }}
              transition={transition}
            >
              <CalendarListView
                events={visibleEvents}
                colors={colors}
                enabled={enabled}
                status={status}
              />
            </motion.div>
          ) : (
            <motion.div
              key="calendar"
              className="absolute inset-0"
              initial={{ opacity: 0, y: slide ? "-4%" : 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: slide ? "-4%" : 0 }}
              transition={transition}
            >
              <CalendarGrid events={visibleEvents} colors={colors} />
            </motion.div>
          )}
        </AnimatePresence>
        {syncError && (
          <div
            className="
              bg-destructive/10 text-destructive border-destructive/20 absolute inset-x-2 bottom-2
              z-20 flex items-center gap-2 rounded-md border px-2.5 py-1.5
            "
          >
            <span className="min-w-0 flex-1 truncate text-2xs">{syncError}</span>
            <button
              type="button"
              onClick={openConfig}
              className="
                text-2xs
                hover:text-foreground
                flex-none font-semibold underline-offset-2
                hover:underline
              "
            >
              Settings
            </button>
          </div>
        )}
      </div>
    </LayoutGroup>
  );
}
