import { useMemo } from "react";
import { CalendarOff } from "lucide-react";
import { CalendarEmpty } from "@/widgets/calendar/components/CalendarEmpty";
import { CalendarEventItem } from "@/widgets/calendar/components/CalendarEventItem";
import { getEventColor } from "@/widgets/calendar/lib/colors";
import {
  formatEventDateRange,
  getEventStartDate,
  isMultiDayEvent,
} from "@/widgets/calendar/lib/agenda";
import type { DisplayCalendarEvent } from "@/widgets/calendar/types";

function sortDayEvents(events: DisplayCalendarEvent[]): DisplayCalendarEvent[] {
  return [...events].sort((first, second) => {
    if (first.isAllDay !== second.isAllDay) return first.isAllDay ? -1 : 1;
    return getEventStartDate(first).getTime() - getEventStartDate(second).getTime();
  });
}

type DayPreviewProps = {
  events: DisplayCalendarEvent[];
  colors: Map<string, string>;
  now: Date;
  reduced: boolean | null;
};

export function DayPreview({ events, colors, now, reduced }: DayPreviewProps) {
  const sorted = useMemo(() => sortDayEvents(events), [events]);

  if (sorted.length === 0) {
    return <CalendarEmpty icon={CalendarOff}>No events</CalendarEmpty>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5 overflow-y-auto pr-0.5">
      {sorted.map((event, index) => (
        <CalendarEventItem
          key={event.id}
          event={event}
          index={index}
          color={getEventColor(event, colors)}
          now={now}
          emphasized={index === 0 && !event.isAllDay}
          timeLabel={isMultiDayEvent(event) ? formatEventDateRange(event) : undefined}
          reduced={reduced}
          layoutId={`event-card-${event.id}`}
        />
      ))}
    </div>
  );
}
