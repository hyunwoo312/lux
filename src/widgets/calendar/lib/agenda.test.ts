import { describe, expect, it } from "vitest";
import {
  dedupeCalendarEvents,
  getAgendaGroups,
  getEventsInRange,
  getMultiDayEvents,
  isMultiDayEvent,
} from "@/widgets/calendar/lib/agenda";
import type { CalendarEvent } from "@/widgets/calendar/types";

function createEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: overrides.id ?? "google-primary-evt",
    calendarId: overrides.calendarId ?? "primary",
    title: overrides.title ?? "Meeting",
    startsAt: overrides.startsAt ?? "2026-06-20T09:00:00.000Z",
    endsAt: overrides.endsAt ?? "2026-06-20T10:00:00.000Z",
    location: overrides.location,
    sourceUrl: overrides.sourceUrl,
    isAllDay: overrides.isAllDay ?? false,
    visibility: overrides.visibility ?? "default",
  };
}

describe("dedupeCalendarEvents", () => {
  it("collapses identical events surfaced from two calendars", () => {
    const events = [
      createEvent({ id: "a", calendarId: "primary" }),
      createEvent({ id: "b", calendarId: "team" }),
    ];
    expect(dedupeCalendarEvents(events)).toHaveLength(1);
  });

  it("keeps events that differ in time", () => {
    const events = [
      createEvent({ id: "a" }),
      createEvent({ id: "b", startsAt: "2026-06-20T11:00:00.000Z", endsAt: "2026-06-20T12:00:00.000Z" }),
    ];
    expect(dedupeCalendarEvents(events)).toHaveLength(2);
  });
});

describe("multi-day events", () => {
  it("identifies an event spanning more than one day", () => {
    const event = createEvent({
      isAllDay: true,
      startsAt: "2026-06-20T00:00:00.000Z",
      endsAt: "2026-06-23T00:00:00.000Z",
    });
    expect(isMultiDayEvent(event)).toBe(true);
  });

  it("separates multi-day events from single-day events", () => {
    const single = createEvent({ id: "single" });
    const multi = createEvent({
      id: "multi",
      isAllDay: true,
      startsAt: "2026-06-19T00:00:00.000Z",
      endsAt: "2026-06-22T00:00:00.000Z",
    });
    const multiDay = getMultiDayEvents([single, multi]);
    expect(multiDay.map((event) => event.id)).toEqual(["multi"]);
  });
});

describe("getEventsInRange + getAgendaGroups", () => {
  it("includes only events that fall within the lookahead window", () => {
    const start = new Date(2026, 5, 20);
    const inRange = createEvent({ id: "in", startsAt: "2026-06-21T09:00:00.000Z", endsAt: "2026-06-21T10:00:00.000Z" });
    const outOfRange = createEvent({ id: "out", startsAt: "2026-07-15T09:00:00.000Z", endsAt: "2026-07-15T10:00:00.000Z" });

    const ranged = getEventsInRange([inRange, outOfRange], start, 7);
    expect(ranged.map((event) => event.id)).toEqual(["in"]);
  });

  it("groups events by day with friendly labels", () => {
    const today = new Date(2026, 5, 20);
    const todayEvent = createEvent({ id: "today", startsAt: "2026-06-20T09:00:00.000Z", endsAt: "2026-06-20T10:00:00.000Z" });
    const groups = getAgendaGroups([todayEvent], today, 7, today);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe("Today");
  });
});
