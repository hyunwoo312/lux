import { describe, expect, it } from "vitest";
import {
  dedupeCalendarEvents,
  formatEventRelativeTime,
  formatEventTime,
  getEventDisplayEndDate,
  getEventsByDate,
  getEventTitle,
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
  it("keeps the primary provider's copy and merges both links onto it", () => {
    const [merged, ...rest] = dedupeCalendarEvents([
      createEvent({ id: "microsoft-1", sourceUrl: "https://outlook/1" }),
      createEvent({ id: "google-1", sourceUrl: "https://google/1" }),
    ]);

    expect(rest).toHaveLength(0);
    expect(merged?.id).toBe("google-1");
    expect(merged?.links.map((link) => link.provider)).toEqual(["google", "microsoft"]);
    expect(merged?.links.map((link) => link.sourceUrl)).toEqual([
      "https://google/1",
      "https://outlook/1",
    ]);
  });

  it("keeps events that differ in time", () => {
    const events = dedupeCalendarEvents([
      createEvent({ id: "a" }),
      createEvent({
        id: "b",
        startsAt: "2026-06-20T11:00:00.000Z",
        endsAt: "2026-06-20T12:00:00.000Z",
      }),
    ]);

    expect(events.map((event) => event.id)).toEqual(["a", "b"]);
  });

  it("does not collapse two events that merely share a title", () => {
    const events = dedupeCalendarEvents([
      createEvent({ id: "a", title: "Standup" }),
      createEvent({ id: "b", title: "Standup", startsAt: "2026-06-21T09:00:00.000Z" }),
    ]);

    expect(events).toHaveLength(2);
  });
});

describe("getEventTitle", () => {
  it("masks a busy event's title, so a private entry never leaks onto the dashboard", () => {
    expect(getEventTitle(createEvent({ title: "Divorce lawyer", visibility: "busy" }))).toBe(
      "Busy",
    );
  });

  it("shows the real title for anything not marked busy", () => {
    expect(getEventTitle(createEvent({ title: "Standup" }))).toBe("Standup");
  });
});

describe("all-day spans", () => {
  const localDay = (year: number, month: number, day: number) =>
    new Date(year, month, day).toISOString();

  it("ends an all-day event a moment before the exclusive end date it was given", () => {
    const event = createEvent({
      isAllDay: true,
      startsAt: localDay(2026, 5, 20),
      endsAt: localDay(2026, 5, 21),
    });

    expect(getEventDisplayEndDate(event).getDate()).toBe(20);
    expect(isMultiDayEvent(event)).toBe(false);
  });

  it("identifies an event spanning more than one day", () => {
    expect(
      isMultiDayEvent(
        createEvent({
          isAllDay: true,
          startsAt: localDay(2026, 5, 20),
          endsAt: localDay(2026, 5, 23),
        }),
      ),
    ).toBe(true);
  });
});

describe("getEventsByDate", () => {
  const localAt = (day: number, hour = 9) => new Date(2026, 5, day, hour).toISOString();

  it("repeats a multi-day event under every day it covers", () => {
    const byDate = getEventsByDate([
      createEvent({
        id: "offsite",
        isAllDay: true,
        startsAt: new Date(2026, 5, 20).toISOString(),
        endsAt: new Date(2026, 5, 23).toISOString(),
      }),
    ]);

    expect([...byDate.keys()]).toEqual(["2026-5-20", "2026-5-21", "2026-5-22"]);
  });

  it("groups same-day events together rather than replacing one another", () => {
    const byDate = getEventsByDate([
      createEvent({ id: "a", startsAt: localAt(20, 9), endsAt: localAt(20, 10) }),
      createEvent({ id: "b", startsAt: localAt(20, 14), endsAt: localAt(20, 15) }),
    ]);

    expect(byDate.get("2026-5-20")?.map((event) => event.id)).toEqual(["a", "b"]);
  });
});

describe("formatEventTime", () => {
  const at = (iso: string) => createEvent({ startsAt: iso, endsAt: iso });

  it("drops the leading zero on a 12-hour clock", () => {
    expect(formatEventTime(at("2026-08-04T09:05:00"), true)).toMatch(/^9:05/);
  });

  it("keeps the leading zero on a 24-hour clock", () => {
    expect(formatEventTime(at("2026-08-04T09:05:00"), false)).toBe("09:05");
  });

  it("reads an all-day event as All day rather than a time", () => {
    expect(formatEventTime(createEvent({ isAllDay: true }), false)).toBe("All day");
  });
});

describe("formatEventRelativeTime", () => {
  const now = new Date("2026-06-20T09:00:00.000Z");
  const startingAt = (iso: string) => createEvent({ startsAt: iso });

  it.each([
    ["2026-06-20T09:00:10.000Z", "now"],
    ["2026-06-20T09:20:00.000Z", "in 20m"],
    ["2026-06-20T12:00:00.000Z", "in 3h"],
    ["2026-06-20T08:00:00.000Z", null],
    ["2026-06-21T09:00:00.000Z", null],
  ])("reads a start of %s as %s", (startsAt, expected) => {
    expect(formatEventRelativeTime(startingAt(startsAt), now)).toBe(expected);
  });

  it("says nothing for an all-day event, which has no useful countdown", () => {
    expect(formatEventRelativeTime(createEvent({ isAllDay: true }), now)).toBeNull();
  });
});
