import {
  getEventDisplayEndDate,
  getEventStartDate,
  isMultiDayEvent,
} from "@/widgets/calendar/lib/agenda";
import { getDateKey, startOfDay } from "@/widgets/calendar/lib/dates";
import type { CalendarEvent } from "@/widgets/calendar/types";

const DAY_MS = 86_400_000;
const GRID_DAYS = 42;

export const DAY_NUMBER_HEIGHT = 18;
export const EVENT_ROW_HEIGHT = 18;

const WEEKS_PER_GRID = 6;
const COLUMNS_PER_WEEK = 7;
const BAR_INSET = 4;
const BAR_TITLE_MIN_WIDTH = 40;

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

function buildWeekSegments(
  spans: RangedSpan[],
  weekStart: number,
  weekEnd: number,
): EventSegment[] {
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

export type MonthMetrics = {
  rowHeight: number;
  cellWidth: number;
  maxRows: number;
  summaryMode: boolean;
};

export function getMonthMetrics(width: number, height: number): MonthMetrics {
  const rowHeight = height / WEEKS_PER_GRID;
  const cellWidth = width / COLUMNS_PER_WEEK;
  const maxRows = Math.max(0, Math.floor((rowHeight - DAY_NUMBER_HEIGHT) / EVENT_ROW_HEIGHT));
  return { rowHeight, cellWidth, maxRows, summaryMode: maxRows < 1 };
}

export function shouldShowBarTitle(span: number, cellWidth: number): boolean {
  return span * cellWidth - BAR_INSET >= BAR_TITLE_MIN_WIDTH;
}

export type WeekRowBudget = { bandRows: number; bottomRows: number };

export function getWeekRowBudget(week: MonthWeek, maxRows: number): WeekRowBudget {
  const weekHasTimed = week.days.some((day) => day.timedEvents.length > 0);
  const fitting = Math.min(week.laneCount, maxRows);
  const needsBottomRow = maxRows > 0 && (week.laneCount > maxRows || weekHasTimed);
  const bandRows = fitting === maxRows && needsBottomRow ? maxRows - 1 : fitting;
  return { bandRows, bottomRows: Math.max(0, maxRows - bandRows) };
}

export function countHiddenBars(week: MonthWeek, bandRows: number, column: number): number {
  return week.segments.filter(
    (segment) =>
      segment.lane >= bandRows &&
      segment.startCol <= column &&
      column < segment.startCol + segment.span,
  ).length;
}

export type DayBottomPlan = { visibleCount: number; moreCount: number };

export function getDayBottomPlan(
  timedCount: number,
  hiddenBars: number,
  bottomRows: number,
): DayBottomPlan {
  if (bottomRows <= 0) return { visibleCount: 0, moreCount: hiddenBars + timedCount };
  const wantsMore = hiddenBars > 0 || timedCount > bottomRows;
  const visibleCount = Math.min(timedCount, wantsMore ? bottomRows - 1 : bottomRows);
  return { visibleCount, moreCount: hiddenBars + timedCount - visibleCount };
}

export function getBarColumn(ratio: number, segment: EventSegment): number {
  const offset = Math.min(segment.span - 1, Math.max(0, Math.floor(ratio * segment.span)));
  return segment.startCol + offset;
}
