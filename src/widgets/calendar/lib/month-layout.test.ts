import { describe, expect, it } from "vitest";
import { getMonthGridDays } from "@/widgets/calendar/lib/dates";
import {
  computeMonthLayout,
  countHiddenBars,
  getBarColumn,
  getDayBottomPlan,
  getMonthMetrics,
  getWeekRowBudget,
  shouldShowBarTitle,
} from "@/widgets/calendar/lib/month-layout";
import type { CalendarEvent } from "@/widgets/calendar/types";

const VISIBLE_MONTH = new Date(2026, 5, 1);
const DAYS = getMonthGridDays(VISIBLE_MONTH);
const TODAY_KEY = "2026-5-15";

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function allDayEvent(id: string, startIndex: number, endIndex: number): CalendarEvent {
  return {
    id,
    calendarId: "c",
    title: id,
    startsAt: DAYS[startIndex]!.toISOString(),
    endsAt: addDays(DAYS[endIndex]!, 1).toISOString(),
    isAllDay: true,
    visibility: "default",
  };
}

function timedEvent(id: string, index: number, hour: number): CalendarEvent {
  const start = new Date(DAYS[index]!);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(hour + 1, 0, 0, 0);
  return {
    id,
    calendarId: "c",
    title: id,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    isAllDay: false,
    visibility: "default",
  };
}

describe("computeMonthLayout", () => {
  it("places a single all-day event as a one-column segment in its week", () => {
    const layout = computeMonthLayout(DAYS, [allDayEvent("e", 10, 10)], VISIBLE_MONTH, TODAY_KEY);
    expect(layout.weeks[1]?.laneCount).toBe(1);
    expect(layout.weeks[1]?.segments).toEqual([
      {
        event: expect.objectContaining({ id: "e" }),
        lane: 0,
        startCol: 3,
        span: 1,
        continuesLeft: false,
        continuesRight: false,
      },
    ]);
  });

  it("splits a multi-day event into per-week segments on the same lane", () => {
    const layout = computeMonthLayout(
      DAYS,
      [allDayEvent("trip", 12, 16)],
      VISIBLE_MONTH,
      TODAY_KEY,
    );

    expect(layout.weeks[1]?.segments[0]).toMatchObject({
      lane: 0,
      startCol: 5,
      span: 2,
      continuesLeft: false,
      continuesRight: true,
    });
    expect(layout.weeks[2]?.segments[0]).toMatchObject({
      lane: 0,
      startCol: 0,
      span: 3,
      continuesLeft: true,
      continuesRight: false,
    });
  });

  it("stacks overlapping multi-day events onto separate lanes", () => {
    const layout = computeMonthLayout(
      DAYS,
      [allDayEvent("a", 10, 13), allDayEvent("b", 12, 15)],
      VISIBLE_MONTH,
      TODAY_KEY,
    );
    expect(layout.weeks[1]?.laneCount).toBe(2);
    const lanes = layout.weeks[1]?.segments.map((segment) => segment.lane).sort();
    expect(lanes).toEqual([0, 1]);
  });

  it("groups timed single-day events by day, sorted by start time", () => {
    const layout = computeMonthLayout(
      DAYS,
      [timedEvent("late", 20, 16), timedEvent("early", 20, 9)],
      VISIBLE_MONTH,
      TODAY_KEY,
    );
    const cell = layout.weeks[2]?.days[6];
    expect(cell?.timedEvents.map((event) => event.id)).toEqual(["early", "late"]);
    expect(layout.weeks[2]?.laneCount).toBe(0);
  });

  it("marks current-month days and produces six weeks of seven days", () => {
    const layout = computeMonthLayout(DAYS, [], VISIBLE_MONTH, TODAY_KEY);
    expect(layout.weeks).toHaveLength(6);
    expect(layout.weeks.every((week) => week.days.length === 7)).toBe(true);
    const inMonth = layout.weeks.flatMap((week) => week.days).filter((day) => day.inCurrentMonth);
    expect(inMonth).toHaveLength(30);
  });

  it("scopes lane reservation per week so a busy week does not inflate a quiet week", () => {
    const layout = computeMonthLayout(
      DAYS,
      [allDayEvent("a", 8, 11), allDayEvent("b", 9, 12), allDayEvent("c", 22, 24)],
      VISIBLE_MONTH,
      TODAY_KEY,
    );
    expect(layout.weeks[1]?.laneCount).toBe(2);
    expect(layout.weeks[3]?.laneCount).toBe(1);
  });
});

const GRID_CHROME_HEIGHT = 46;
const CONTENT_WIDTH = (columns: number) => columns * 50 - 42;
const GRID_HEIGHT = (rows: number) => rows * 50 - 66 - GRID_CHROME_HEIGHT;

describe("getMonthMetrics", () => {
  it("falls back to summary mode at the widget's minimum height", () => {
    const metrics = getMonthMetrics(CONTENT_WIDTH(6), GRID_HEIGHT(6));

    expect(metrics.maxRows).toBe(0);
    expect(metrics.summaryMode).toBe(true);
  });

  it("budgets event rows at the default size", () => {
    const metrics = getMonthMetrics(CONTENT_WIDTH(8), GRID_HEIGHT(9));

    expect(metrics.maxRows).toBe(2);
    expect(metrics.summaryMode).toBe(false);
  });

  it("gains a row for every extra unit of height", () => {
    expect(getMonthMetrics(CONTENT_WIDTH(8), GRID_HEIGHT(7)).maxRows).toBe(1);
    expect(getMonthMetrics(CONTENT_WIDTH(8), GRID_HEIGHT(14)).maxRows).toBe(4);
  });

  it("reports summary mode before the grid has been measured", () => {
    expect(getMonthMetrics(0, 0).summaryMode).toBe(true);
  });
});

describe("shouldShowBarTitle", () => {
  it("labels a single-day bar at the default width", () => {
    const { cellWidth } = getMonthMetrics(CONTENT_WIDTH(8), GRID_HEIGHT(9));

    expect(shouldShowBarTitle(1, cellWidth)).toBe(true);
  });

  it("drops the label only when the bar is too narrow to read", () => {
    const { cellWidth } = getMonthMetrics(CONTENT_WIDTH(6), GRID_HEIGHT(9));

    expect(shouldShowBarTitle(1, cellWidth)).toBe(false);
    expect(shouldShowBarTitle(2, cellWidth)).toBe(true);
  });
});

describe("getWeekRowBudget", () => {
  function weekWith(events: CalendarEvent[]) {
    const layout = computeMonthLayout(DAYS, events, VISIBLE_MONTH, TODAY_KEY);
    return layout.weeks[1]!;
  }

  it("gives every lane a row when the week fits", () => {
    expect(getWeekRowBudget(weekWith([allDayEvent("a", 8, 9)]), 3)).toEqual({
      bandRows: 1,
      bottomRows: 2,
    });
  });

  it("reserves a row for the overflow count when lanes exceed the budget", () => {
    const week = weekWith([
      allDayEvent("a", 8, 11),
      allDayEvent("b", 9, 12),
      allDayEvent("c", 10, 13),
    ]);

    expect(getWeekRowBudget(week, 2)).toEqual({ bandRows: 1, bottomRows: 1 });
  });

  it("reserves a row for timed events even when the lanes would fill the budget", () => {
    const week = weekWith([allDayEvent("a", 8, 9), timedEvent("t", 10, 9)]);

    expect(getWeekRowBudget(week, 1)).toEqual({ bandRows: 0, bottomRows: 1 });
  });

  it("collapses to no rows at all in summary mode", () => {
    expect(getWeekRowBudget(weekWith([allDayEvent("a", 8, 9)]), 0)).toEqual({
      bandRows: 0,
      bottomRows: 0,
    });
  });
});

describe("countHiddenBars", () => {
  it("counts only the hidden lanes that cover the column", () => {
    const layout = computeMonthLayout(
      DAYS,
      [allDayEvent("a", 8, 11), allDayEvent("b", 9, 12)],
      VISIBLE_MONTH,
      TODAY_KEY,
    );
    const week = layout.weeks[1]!;

    expect(countHiddenBars(week, 1, 1)).toBe(0);
    expect(countHiddenBars(week, 1, 2)).toBe(1);
    expect(countHiddenBars(week, 0, 1)).toBe(1);
  });
});

describe("getDayBottomPlan", () => {
  it("shows every timed event when they all fit", () => {
    expect(getDayBottomPlan(2, 0, 2)).toEqual({ visibleCount: 2, moreCount: 0 });
  });

  it("sacrifices a row to the overflow count when timed events do not fit", () => {
    expect(getDayBottomPlan(5, 0, 2)).toEqual({ visibleCount: 1, moreCount: 4 });
  });

  it("counts hidden bars alongside hidden timed events", () => {
    expect(getDayBottomPlan(3, 2, 2)).toEqual({ visibleCount: 1, moreCount: 4 });
  });

  it("still surfaces a hidden count when there is no room for a bottom row", () => {
    expect(getDayBottomPlan(4, 3, 0)).toEqual({ visibleCount: 0, moreCount: 7 });
  });
});

describe("getBarColumn", () => {
  const segment = {
    event: allDayEvent("a", 8, 11),
    lane: 0,
    startCol: 1,
    span: 4,
    continuesLeft: false,
    continuesRight: false,
  };

  it("maps a click ratio onto the column under the pointer", () => {
    expect(getBarColumn(0, segment)).toBe(1);
    expect(getBarColumn(0.3, segment)).toBe(2);
    expect(getBarColumn(0.6, segment)).toBe(3);
  });

  it("clamps a click on the trailing edge to the last column", () => {
    expect(getBarColumn(1, segment)).toBe(4);
    expect(getBarColumn(1.5, segment)).toBe(4);
    expect(getBarColumn(-0.5, segment)).toBe(1);
  });
});
