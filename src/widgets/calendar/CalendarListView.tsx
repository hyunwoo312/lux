import { useMemo } from "react";
import { useReducedMotion } from "motion/react";
import { CalendarClock, CalendarOff } from "lucide-react";
import { useNow } from "@/hooks/useNow";
import { CalendarEmpty } from "@/widgets/calendar/components/CalendarEmpty";
import { CalendarEventItem } from "@/widgets/calendar/components/CalendarEventItem";
import { getEventColor } from "@/widgets/calendar/lib/colors";
import {
  formatEventDateRange,
  getAgendaGroups,
  getEventsInRange,
  getMultiDayEvents,
  isMultiDayEvent,
} from "@/widgets/calendar/lib/agenda";
import { startOfDay } from "@/widgets/calendar/lib/dates";
import { useCalendar } from "@/widgets/calendar/useCalendarStore";
import type { CalendarSyncStatus, DisplayCalendarEvent } from "@/widgets/calendar/types";

type CalendarListViewProps = {
  events: DisplayCalendarEvent[];
  colors: Map<string, string>;
  enabled: boolean;
  status: CalendarSyncStatus;
};

export function CalendarListView({ events, colors, enabled, status }: CalendarListViewProps) {
  const reduced = useReducedMotion();
  const lookaheadDays = useCalendar((d) => d.lookaheadDays);
  const listAnchor = useCalendar((d) => d.listAnchor);
  const now = useNow();
  const today = useMemo(() => startOfDay(now), [now]);
  const rangeEvents = useMemo(
    () => getEventsInRange(events, listAnchor, lookaheadDays),
    [events, listAnchor, lookaheadDays],
  );
  const multiDayEvents = useMemo(() => getMultiDayEvents(rangeEvents), [rangeEvents]);
  const groups = useMemo(
    () =>
      getAgendaGroups(
        rangeEvents.filter((event) => !isMultiDayEvent(event)),
        listAnchor,
        lookaheadDays,
        today,
      ),
    [rangeEvents, listAnchor, lookaheadDays, today],
  );

  if (!enabled) {
    return <CalendarEmpty icon={CalendarOff}>Events are hidden. Re-enable them in settings.</CalendarEmpty>;
  }

  const hasEvents = multiDayEvents.length > 0 || groups.length > 0;
  if (!hasEvents) {
    return status === "syncing" ? (
      <CalendarEmpty icon={CalendarClock}>Syncing your calendar…</CalendarEmpty>
    ) : (
      <CalendarEmpty icon={CalendarOff}>No upcoming events.</CalendarEmpty>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
      {multiDayEvents.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h4 className="text-muted-foreground text-2xs pl-1 font-bold tracking-wider uppercase">
            Multi-day
          </h4>
          {multiDayEvents.map((event, index) => (
            <CalendarEventItem
              key={event.id}
              event={event}
              index={index}
              color={getEventColor(event, colors)}
              now={now}
              timeLabel={formatEventDateRange(event)}
              reduced={reduced}
              layoutId={`event-card-${event.id}`}
            />
          ))}
        </section>
      )}
      {groups.map((group) => (
        <section key={group.id} className="flex flex-col gap-1.5">
          <h4 className="text-muted-foreground/70 text-2xs pl-1 font-bold tracking-wider uppercase">
            {group.label}
          </h4>
          {group.events.map((event, index) => (
            <CalendarEventItem
              key={event.id}
              event={event}
              index={index}
              color={getEventColor(event, colors)}
              now={now}
              emphasized={index === 0}
              reduced={reduced}
              layoutId={`event-card-${event.id}`}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
