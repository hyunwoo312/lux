import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getDateKey } from "@/widgets/calendar/lib/dates";
import type { MonthDayCell as MonthDay } from "@/widgets/calendar/lib/month-layout";
import { useCalendar, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const headingFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

type MonthDayCellProps = {
  day: MonthDay;
  children: ReactNode;
};

export function MonthDayCell({ day, children }: MonthDayCellProps) {
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
      aria-label={headingFormatter.format(day.date)}
      aria-selected={isSelected || undefined}
      onClick={() => (mode === "week" ? selectDay(instanceId, day.date) : focusDay(instanceId, day.date))}
      className={cn(
        "focus-visible:bg-foreground/[0.05]",
        "relative flex min-w-0 flex-col overflow-hidden rounded-md text-left outline-none",
        "transition-colors",
        day.isToday && "bg-primary/5",
      )}
    >
      <span className="flex h-[22px] items-center justify-center">
        <span
          className={cn(
            "grid size-[18px] place-items-center rounded-full text-xs tabular-nums",
            day.isToday && "bg-primary text-primary-foreground font-semibold",
            !day.isToday && (day.inCurrentMonth ? "text-foreground" : "text-muted-foreground/40"),
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
