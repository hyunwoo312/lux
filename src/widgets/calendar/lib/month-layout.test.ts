import { describe, expect, it } from "vitest";
import { getMonthGridDays } from "@/widgets/calendar/lib/dates";
import { computeMonthLayout } from "@/widgets/calendar/lib/month-layout";
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
      { event: expect.objectContaining({ id: "e" }), lane: 0, startCol: 3, span: 1, continuesLeft: false, continuesRight: false },
    ]);
  });

  it("splits a multi-day event into per-week segments on the same lane", () => {
    const layout = computeMonthLayout(DAYS, [allDayEvent("trip", 12, 16)], VISIBLE_MONTH, TODAY_KEY);

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
