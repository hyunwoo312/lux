import { enterTween, springCrisp } from "@/lib/motion";
import type { MouseEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { localDayKey } from "@/lib/clock";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { MonthDayCell } from "@/widgets/calendar/components/MonthDayCell";
import { getEventColor, getReadableTextColor } from "@/widgets/calendar/lib/colors";
import { getEventTitle } from "@/widgets/calendar/lib/agenda";
import {
  countHiddenBars,
  DAY_NUMBER_HEIGHT,
  EVENT_ROW_HEIGHT,
  getBarColumn,
  getDayBottomPlan,
  getWeekRowBudget,
  shouldShowBarTitle,
  type EventSegment,
  type MonthMetrics,
  type MonthWeek as MonthWeekData,
} from "@/widgets/calendar/lib/month-layout";
import type { CalendarEvent } from "@/widgets/calendar/types";
import { useCalendar, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const SUMMARY_SWATCHES = 3;

type MonthWeekProps = {
  week: MonthWeekData;
  eventsByDate: Map<string, CalendarEvent[]>;
  colors: Map<string, string>;
  metrics: MonthMetrics;
  collapsed: boolean;
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
  onActivate: (column: number) => void;
}) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    onActivate(getBarColumn(ratio, segment));
  };
  return (
    <Tooltip content={getEventTitle(segment.event)} prose side="top">
      <button
        type="button"
        tabIndex={-1}
        aria-label={getEventTitle(segment.event)}
        onClick={handleClick}
        className={cn(
          "press cursor-pointer",
          `
            pointer-events-auto absolute flex items-center overflow-hidden px-1 text-micro
            font-medium
          `,
          segment.continuesLeft ? "rounded-l-none" : "rounded-l-xs",
          segment.continuesRight ? "rounded-r-none" : "rounded-r-xs",
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
    <Tooltip content={getEventTitle(event)} prose side="top">
      <span
        className="flex items-center gap-1 truncate px-1 text-micro"
        style={{ height: `${EVENT_ROW_HEIGHT}px` }}
      >
        <span className="size-1.5 flex-none rounded-full" style={{ backgroundColor: color }} />
        <span className="text-ink-2 truncate">{getEventTitle(event)}</span>
      </span>
    </Tooltip>
  );
}

function DaySummary({ events, colors }: { events: CalendarEvent[]; colors: Map<string, string> }) {
  if (events.length === 0) return null;
  return (
    <span aria-hidden className="flex items-center gap-0.5 px-1">
      <span className="flex h-1 min-w-0 flex-1 gap-0.5">
        {events.slice(0, SUMMARY_SWATCHES).map((event) => (
          <i
            key={event.id}
            className="min-w-0 flex-1 rounded-full"
            style={{ backgroundColor: getEventColor(event, colors) }}
          />
        ))}
      </span>
      <span className="text-ink-2 text-micro leading-none font-semibold tabular-nums">
        {events.length}
      </span>
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
  const { visibleCount, moreCount } = getDayBottomPlan(timedEvents.length, hiddenBars, bottomRows);

  return (
    <div className="flex min-w-0 flex-col">
      {timedEvents.slice(0, visibleCount).map((event) => (
        <TimedChip key={event.id} event={event} color={getEventColor(event, colors)} />
      ))}
      {moreCount > 0 && (
        <span
          className="text-ink-3 px-1 text-micro font-medium"
          style={{ height: `${EVENT_ROW_HEIGHT}px` }}
        >
          +{moreCount} more
        </span>
      )}
    </div>
  );
}

export function MonthWeek({ week, eventsByDate, colors, metrics, collapsed }: MonthWeekProps) {
  const reduced = useReducedMotion();
  const instanceId = useWidgetInstanceId();
  const mode = useCalendar((d) => d.mode);
  const selectedDay = useCalendar((d) => d.selectedDay);
  const focusDay = useCalendarStore((s) => s.focusDay);
  const selectDay = useCalendarStore((s) => s.selectDay);
  const activateDay = (date: Date) =>
    mode === "week" ? selectDay(instanceId, date) : focusDay(instanceId, date);
  const selectedCol =
    mode === "week" && selectedDay
      ? week.days.findIndex((day) => day.dateKey === localDayKey(selectedDay))
      : -1;

  const { cellWidth } = metrics;
  const summaryMode = metrics.maxRows === 0;
  const { bandRows, bottomRows } = getWeekRowBudget(week, metrics.maxRows);

  return (
    <div role="presentation" className="border-border/30 relative h-full min-h-0 border-t">
      <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-7">
        {Array.from({ length: 7 }, (_, column) => (
          <div key={column} className="border-border/30 border-r last:border-r-0" />
        ))}
      </div>
      <div role="row" className="relative grid h-full grid-cols-7">
        {week.days.map((day, column) => {
          const dayEvents = eventsByDate.get(day.dateKey) ?? [];
          return (
            <MonthDayCell
              key={day.dateKey}
              day={day}
              eventCount={dayEvents.length}
              isSelected={column === selectedCol}
              collapsed={collapsed}
              onActivate={() => activateDay(day.date)}
            >
              {summaryMode ? (
                <DaySummary events={dayEvents} colors={colors} />
              ) : (
                <>
                  <div style={{ height: `${bandRows * EVENT_ROW_HEIGHT}px` }} aria-hidden />
                  <DayBottom
                    timedEvents={day.timedEvents}
                    hiddenBars={countHiddenBars(week, bandRows, column)}
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
            opacity: enterTween(reduced),
            x: springCrisp(reduced),
          }}
          style={{ width: Math.max(0, cellWidth - 4) }}
          className="
            border-primary pointer-events-none absolute inset-y-0.5 left-0.5 rounded-md border-2
          "
        />
      )}
      {!summaryMode && (
        <div className="pointer-events-none absolute inset-0">
          {week.segments
            .filter((segment) => segment.lane < bandRows)
            .map((segment) => (
              <EventBar
                key={segment.event.id}
                segment={segment}
                color={getEventColor(segment.event, colors)}
                showTitle={shouldShowBarTitle(segment.span, cellWidth)}
                onActivate={(column) => {
                  const date = week.days[column]?.date;
                  if (date) activateDay(date);
                }}
              />
            ))}
        </div>
      )}
    </div>
  );
}
