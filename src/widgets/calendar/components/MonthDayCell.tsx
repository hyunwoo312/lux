import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getDateKey } from "@/widgets/calendar/lib/dates";
import {
  DAY_NUMBER_HEIGHT,
  type MonthDayCell as MonthDay,
} from "@/widgets/calendar/lib/month-layout";
import { useCalendar, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const headingFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

type MonthDayCellProps = {
  day: MonthDay;
  eventCount: number;
  children: ReactNode;
};

function formatDayLabel(date: Date, eventCount: number): string {
  const heading = headingFormatter.format(date);
  if (eventCount === 0) return heading;
  return `${heading}, ${eventCount === 1 ? "1 event" : `${eventCount} events`}`;
}

export function MonthDayCell({ day, eventCount, children }: MonthDayCellProps) {
  const instanceId = useWidgetInstanceId();
  const mode = useCalendar((d) => d.mode);
  const selectedDay = useCalendar((d) => d.selectedDay);
  const focusDay = useCalendarStore((s) => s.focusDay);
  const selectDay = useCalendarStore((s) => s.selectDay);

  const isSelected =
    mode === "week" && selectedDay !== null && getDateKey(selectedDay) === day.dateKey;

  return (
    <button
      type="button"
      role="gridcell"
      aria-label={formatDayLabel(day.date, eventCount)}
      aria-selected={isSelected || undefined}
      onClick={() =>
        mode === "week" ? selectDay(instanceId, day.date) : focusDay(instanceId, day.date)
      }
      className={cn(
        "press cursor-pointer",
        "focus-ring focus-visible:bg-foreground/5",
        "relative flex min-w-0 flex-col overflow-hidden rounded-md text-left",
        "transition-colors",
        day.isToday && "bg-primary/5",
      )}
    >
      <span
        className="flex items-center justify-center"
        style={{ height: `${DAY_NUMBER_HEIGHT}px` }}
      >
        <span
          className={cn(
            "grid size-4 place-items-center rounded-full text-caption tabular-nums",
            day.isToday && "bg-primary text-primary-foreground font-semibold",
            !day.isToday && (day.inCurrentMonth ? "text-ink" : "text-ink-3"),
            !day.isToday && isSelected && "font-semibold",
          )}
        >
          {day.date.getDate()}
        </span>
      </span>
      {children}
    </button>
  );
}
