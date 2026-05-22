import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { MonthDayCell } from "@/widgets/calendar/components/MonthDayCell";
import { getEventColor, getReadableTextColor } from "@/widgets/calendar/lib/colors";
import { getEventTitle } from "@/widgets/calendar/lib/agenda";
import { getDateKey } from "@/widgets/calendar/lib/dates";
import { SLIDE_SPRING } from "@/widgets/calendar/lib/motion";
import type { EventSegment, MonthWeek as MonthWeekData } from "@/widgets/calendar/lib/month-layout";
import type { CalendarEvent } from "@/widgets/calendar/types";
import { useCalendarStore } from "@/widgets/calendar/useCalendarStore";

export const DAY_NUMBER_HEIGHT = 22;
export const EVENT_ROW_HEIGHT = 18;

type MonthWeekProps = {
  week: MonthWeekData;
  eventsByDate: Map<string, CalendarEvent[]>;
  colors: Map<string, string>;
  maxRows: number;
  dotsMode: boolean;
  showTitles: boolean;
  cellWidth: number;
};

function EventBar({
  segment,
  color,
  showTitle,
  onActivate,
}: {
  segment: EventSegment;
  color: string;
  showTitle: boolean;
  onActivate: () => void;
}) {
  return (
    <Tooltip content={getEventTitle(segment.event)} solid side="top">
      <button
        type="button"
        tabIndex={-1}
        aria-label={getEventTitle(segment.event)}
        onClick={onActivate}
        className={cn(
          "pointer-events-auto absolute flex items-center overflow-hidden px-1 text-2xs font-medium",
          segment.continuesLeft ? "rounded-l-none" : "rounded-l-[3px]",
          segment.continuesRight ? "rounded-r-none" : "rounded-r-[3px]",
        )}
        style={{
          left: `calc(${(segment.startCol / 7) * 100}% + 2px)`,
          width: `calc(${(segment.span / 7) * 100}% - 4px)`,
          top: `${DAY_NUMBER_HEIGHT + segment.lane * EVENT_ROW_HEIGHT}px`,
          height: `${EVENT_ROW_HEIGHT - 2}px`,
          backgroundColor: color,
          color: getReadableTextColor(color),
        }}
      >
        {showTitle && !segment.continuesLeft && (
          <span className="truncate">{getEventTitle(segment.event)}</span>
        )}
      </button>
    </Tooltip>
  );
}

function TimedChip({ event, color }: { event: CalendarEvent; color: string }) {
  return (
    <Tooltip content={getEventTitle(event)} solid side="top">
      <span
        className="flex items-center gap-1 truncate px-1 text-2xs"
        style={{ height: `${EVENT_ROW_HEIGHT}px` }}
      >
        <span className="size-1.5 flex-none rounded-full" style={{ backgroundColor: color }} />
        <span className="text-foreground/80 truncate">{getEventTitle(event)}</span>
      </span>
    </Tooltip>
  );
}

function Dots({ events, colors }: { events: CalendarEvent[]; colors: Map<string, string> }) {
  if (events.length === 0) return null;
  return (
    <span className="flex justify-center gap-0.5 pt-0.5" aria-hidden>
      {events.slice(0, 3).map((event) => (
        <i
          key={event.id}
          className="size-1 rounded-full"
          style={{ backgroundColor: getEventColor(event, colors) }}
        />
      ))}
    </span>
  );
}

function DayBottom({
  timedEvents,
  hiddenBars,
  bottomRows,
  colors,
}: {
  timedEvents: CalendarEvent[];
  hiddenBars: number;
  bottomRows: number;
  colors: Map<string, string>;
}) {
  if (bottomRows <= 0) return null;
  const wantsMore = hiddenBars > 0 || timedEvents.length > bottomRows;
  const visible = timedEvents.slice(0, wantsMore ? Math.max(0, bottomRows - 1) : bottomRows);
  const moreCount = hiddenBars + (timedEvents.length - visible.length);

  return (
    <div className="flex min-w-0 flex-col">
      {visible.map((event) => (
        <TimedChip key={event.id} event={event} color={getEventColor(event, colors)} />
      ))}
      {wantsMore && moreCount > 0 && (
        <span
          className="text-muted-foreground px-1 text-2xs font-medium"
          style={{ height: `${EVENT_ROW_HEIGHT}px` }}
        >
          +{moreCount} more
        </span>
      )}
    </div>
  );
}

export function MonthWeek({
  week,
  eventsByDate,
  colors,
  maxRows,
  dotsMode,
  showTitles,
  cellWidth,
}: MonthWeekProps) {
  const reduced = useReducedMotion();
  const mode = useCalendarStore((s) => s.mode);
  const selectedDay = useCalendarStore((s) => s.selectedDay);
  const focusDay = useCalendarStore((s) => s.focusDay);
  const selectDay = useCalendarStore((s) => s.selectDay);
  const activateDay = (date: Date) => (mode === "week" ? selectDay(date) : focusDay(date));
  const selectedCol =
    mode === "week" && selectedDay
      ? week.days.findIndex((day) => day.dateKey === getDateKey(selectedDay))
      : -1;

  const weekHasTimed = week.days.some((day) => day.timedEvents.length > 0);
  let bandRows = Math.min(week.laneCount, maxRows);
  if (bandRows === maxRows && maxRows > 0 && (week.laneCount > maxRows || weekHasTimed)) {
    bandRows = maxRows - 1;
  }
  const bottomRows = Math.max(0, maxRows - bandRows);

  return (
    <div className="border-border/30 relative h-full min-h-0 border-t">
      <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-7">
        {Array.from({ length: 7 }, (_, column) => (
          <div key={column} className="border-border/30 border-r last:border-r-0" />
        ))}
      </div>
      <div role="row" className="relative grid h-full grid-cols-7">
        {week.days.map((day, column) => {
          const dayEvents = eventsByDate.get(day.dateKey) ?? [];
          const hiddenBars = week.segments.filter(
            (segment) =>
              segment.lane >= bandRows &&
              segment.startCol <= column &&
              column < segment.startCol + segment.span,
          ).length;
          return (
            <MonthDayCell key={day.dateKey} day={day}>
              {dotsMode ? (
                <Dots events={dayEvents} colors={colors} />
              ) : (
                <>
                  <div style={{ height: `${bandRows * EVENT_ROW_HEIGHT}px` }} aria-hidden />
                  <DayBottom
                    timedEvents={day.timedEvents}
                    hiddenBars={hiddenBars}
                    bottomRows={bottomRows}
                    colors={colors}
                  />
                </>
              )}
            </MonthDayCell>
          );
        })}
      </div>
      {selectedCol >= 0 && cellWidth > 0 && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0, x: selectedCol * cellWidth }}
          animate={{ opacity: 1, x: selectedCol * cellWidth }}
          transition={{
            opacity: { duration: reduced ? 0 : 0.2 },
            x: reduced ? { duration: 0 } : SLIDE_SPRING,
          }}
          style={{ width: Math.max(0, cellWidth - 4), left: 2, top: 2, bottom: 2 }}
          className="border-primary pointer-events-none absolute rounded-md border-2"
        />
      )}
      {!dotsMode && (
        <div className="pointer-events-none absolute inset-0">
          {week.segments
            .filter((segment) => segment.lane < bandRows)
            .map((segment) => (
              <EventBar
                key={segment.event.id}
                segment={segment}
                color={getEventColor(segment.event, colors)}
                showTitle={showTitles && segment.span * cellWidth > 56}
                onActivate={() => {
                  const date = week.days[segment.startCol]?.date;
                  if (date) activateDay(date);
                }}
              />
            ))}
        </div>
      )}
    </div>
  );
}
