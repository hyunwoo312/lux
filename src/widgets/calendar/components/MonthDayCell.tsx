import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  DAY_NUMBER_HEIGHT,
  type MonthDayCell as MonthDay,
} from "@/widgets/calendar/lib/month-layout";

const headingFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

type MonthDayCellProps = {
  day: MonthDay;
  eventCount: number;
  isSelected: boolean;
  collapsed: boolean;
  onActivate: () => void;
  children: ReactNode;
};

function formatDayLabel(date: Date, eventCount: number): string {
  const heading = headingFormatter.format(date);
  if (eventCount === 0) return heading;
  return `${heading}, ${eventCount === 1 ? "1 event" : `${eventCount} events`}`;
}

export function MonthDayCell({
  day,
  eventCount,
  isSelected,
  collapsed,
  onActivate,
  children,
}: MonthDayCellProps) {
  return (
    <button
      type="button"
      role="gridcell"
      tabIndex={collapsed ? -1 : undefined}
      aria-label={formatDayLabel(day.date, eventCount)}
      aria-selected={isSelected || undefined}
      onClick={onActivate}
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
