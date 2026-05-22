import { useMemo } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { CalendarConnectPrompt } from "@/widgets/calendar/components/CalendarConnectPrompt";
import { CalendarGrid } from "@/widgets/calendar/CalendarGrid";
import { CalendarListView } from "@/widgets/calendar/CalendarListView";
import { useWidgetChrome } from "@/widgets/core/useWidgetChrome";
import { useCalendarAutoSync } from "@/widgets/calendar/hooks/useCalendarAutoSync";
import { useCalendarConnection } from "@/widgets/calendar/hooks/useCalendarConnection";
import { dedupeCalendarEvents } from "@/widgets/calendar/lib/agenda";
import { buildCalendarColorMap } from "@/widgets/calendar/lib/colors";
import { useCalendarStore } from "@/widgets/calendar/useCalendarStore";

const PANE_EASE = [0.22, 1, 0.36, 1] as const;

export function CalendarWidget() {
  const reduced = useReducedMotion();
  const google = useCalendarConnection("google");
  const microsoft = useCalendarConnection("microsoft");
  const events = useCalendarStore((s) => s.events);
  const enabled = useCalendarStore((s) => s.enabled);
  const view = useCalendarStore((s) => s.view);
  const mode = useCalendarStore((s) => s.mode);
  const status = useCalendarStore((s) => s.status);
  const primarySource = useCalendarStore((s) => s.primarySource);
  const googleCalendars = useCalendarStore((s) => s.google.calendars);
  const microsoftCalendars = useCalendarStore((s) => s.microsoft.calendars);
  const googleError = useCalendarStore((s) => s.google.lastError);
  const microsoftError = useCalendarStore((s) => s.microsoft.lastError);

  const { openConfig } = useWidgetChrome();
  const connected = Boolean(google.account || microsoft.account);
  useCalendarAutoSync(connected);

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
        loaded={loaded}
        error={google.error ?? microsoft.error ?? null}
        options={[
          {
            label: "Google Calendar",
            busy: google.busy === "connecting",
            onConnect: google.connect,
          },
          {
            label: "Outlook Calendar",
            busy: microsoft.busy === "connecting",
            onConnect: microsoft.connect,
          },
        ]}
      />
    );
  }

  const slide = !reduced && mode === "month";
  const transition = { duration: reduced ? 0 : 0.3, ease: PANE_EASE };

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
              z-20 flex items-center gap-2 rounded-md border px-2.5 py-1.5 backdrop-blur-sm
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
