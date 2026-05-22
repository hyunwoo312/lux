import {
  getEventDisplayEndDate,
  getEventStartDate,
  isMultiDayEvent,
} from "@/widgets/calendar/lib/agenda";
import { getDateKey, startOfDay } from "@/widgets/calendar/lib/dates";
import type { CalendarEvent } from "@/widgets/calendar/types";

const DAY_MS = 86_400_000;
const GRID_DAYS = 42;

export type EventSegment = {
  event: CalendarEvent;
  lane: number;
  startCol: number;
  span: number;
  continuesLeft: boolean;
  continuesRight: boolean;
};

export type MonthDayCell = {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  timedEvents: CalendarEvent[];
};

export type MonthWeek = {
  days: MonthDayCell[];
  segments: EventSegment[];
  laneCount: number;
};

type MonthLayout = {
  weeks: MonthWeek[];
};

function isSpanningEvent(event: CalendarEvent): boolean {
  return event.isAllDay || isMultiDayEvent(event);
}

function getGridIndex(date: Date, gridStart: Date): number {
  return Math.round((startOfDay(date).getTime() - gridStart.getTime()) / DAY_MS);
}

type RangedSpan = {
  event: CalendarEvent;
  startIndex: number;
  endIndex: number;
};

function getRangedSpans(events: CalendarEvent[], gridStart: Date): RangedSpan[] {
  return events
    .map((event) => ({
      event,
      startIndex: getGridIndex(getEventStartDate(event), gridStart),
      endIndex: getGridIndex(getEventDisplayEndDate(event), gridStart),
    }))
    .filter((entry) => entry.endIndex >= 0 && entry.startIndex <= GRID_DAYS - 1)
    .map((entry) => ({
      event: entry.event,
      startIndex: Math.max(0, entry.startIndex),
      endIndex: Math.min(GRID_DAYS - 1, entry.endIndex),
    }));
}

function buildWeekSegments(spans: RangedSpan[], weekStart: number, weekEnd: number): EventSegment[] {
  const weekSpans = spans
    .filter((span) => span.startIndex <= weekEnd && span.endIndex >= weekStart)
    .map((span) => {
      const segStart = Math.max(span.startIndex, weekStart);
      const segEnd = Math.min(span.endIndex, weekEnd);
      return {
        event: span.event,
        startCol: segStart - weekStart,
        span: segEnd - segStart + 1,
        continuesLeft: span.startIndex < weekStart,
        continuesRight: span.endIndex > weekEnd,
      };
    })
    .sort((a, b) => a.startCol - b.startCol || b.span - a.span);

  const laneEnds: number[] = [];
  return weekSpans
    .map((segment) => {
      let lane = laneEnds.findIndex((end) => end < segment.startCol);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = segment.startCol + segment.span - 1;
      return { ...segment, lane };
    })
    .sort((a, b) => a.lane - b.lane);
}

export function computeMonthLayout(
  monthDays: Date[],
  events: CalendarEvent[],
  visibleMonth: Date,
  todayKey: string,
): MonthLayout {
  const gridStart = startOfDay(monthDays[0] ?? new Date());
  const visibleMonthIndex = visibleMonth.getMonth();

  const spans = getRangedSpans(events.filter(isSpanningEvent), gridStart);

  const timedByIndex = new Map<number, CalendarEvent[]>();
  for (const event of events) {
    if (isSpanningEvent(event)) continue;
    const index = getGridIndex(getEventStartDate(event), gridStart);
    if (index < 0 || index > GRID_DAYS - 1) continue;
    timedByIndex.set(index, [...(timedByIndex.get(index) ?? []), event]);
  }
  for (const list of timedByIndex.values()) {
    list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }

  const weeks: MonthWeek[] = [];
  for (let week = 0; week < GRID_DAYS / 7; week++) {
    const weekStart = week * 7;
    const weekEnd = weekStart + 6;
    const days: MonthDayCell[] = [];

    for (let column = 0; column < 7; column++) {
      const index = weekStart + column;
      const date = monthDays[index];
      if (!date) continue;
      const dateKey = getDateKey(date);
      days.push({
        date,
        dateKey,
        inCurrentMonth: date.getMonth() === visibleMonthIndex,
        isToday: dateKey === todayKey,
        timedEvents: timedByIndex.get(index) ?? [],
      });
    }

    const segments = buildWeekSegments(spans, weekStart, weekEnd);
    const weekLaneCount = segments.reduce((max, segment) => Math.max(max, segment.lane + 1), 0);
    weeks.push({ days, segments, laneCount: weekLaneCount });
  }

  return { weeks };
}
