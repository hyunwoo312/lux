import { describe, expect, it } from "vitest";
import {
  buildGoogleEventsUrl,
  normalizeGoogleCalendar,
  normalizeGoogleEvent,
} from "@/widgets/calendar/lib/google-calendar-api";

describe("normalizeGoogleEvent", () => {
  it("normalizes a timed event with title and links", () => {
    const event = normalizeGoogleEvent(
      {
        id: "evt1",
        summary: "Standup",
        start: { dateTime: "2026-06-20T09:00:00Z" },
        end: { dateTime: "2026-06-20T09:30:00Z" },
        location: "Room 4",
        htmlLink: "https://calendar.google.com/evt1",
      },
      "primary",
    );

    expect(event).toMatchObject({
      id: "google-primary-evt1",
      calendarId: "primary",
      title: "Standup",
      location: "Room 4",
      sourceUrl: "https://calendar.google.com/evt1",
      isAllDay: false,
      visibility: "default",
    });
  });

  it("treats date-only events as all-day", () => {
    const event = normalizeGoogleEvent(
      { id: "evt2", summary: "Holiday", start: { date: "2026-06-21" }, end: { date: "2026-06-22" } },
      "primary",
    );
    expect(event?.isAllDay).toBe(true);
  });

  it("marks events without a title as busy", () => {
    const event = normalizeGoogleEvent(
      { id: "evt3", start: { dateTime: "2026-06-20T09:00:00Z" }, end: { dateTime: "2026-06-20T10:00:00Z" } },
      "primary",
    );
    expect(event?.visibility).toBe("busy");
    expect(event?.title).toBe("Busy");
  });

  it("drops cancelled events and events without dates", () => {
    expect(normalizeGoogleEvent({ id: "x", status: "cancelled" }, "primary")).toBeNull();
    expect(normalizeGoogleEvent({ id: "y", summary: "No dates" }, "primary")).toBeNull();
  });
});

describe("normalizeGoogleCalendar", () => {
  it("selects the primary calendar when nothing is stored", () => {
    const calendar = normalizeGoogleCalendar({ id: "p", summary: "Primary", primary: true }, []);
    expect(calendar).toMatchObject({ id: "p", primary: true, selected: true });
  });

  it("respects stored selection over primary", () => {
    const calendar = normalizeGoogleCalendar({ id: "p", summary: "Primary", primary: true }, ["other"]);
    expect(calendar?.selected).toBe(false);
  });

  it("drops calendars missing an id or summary", () => {
    expect(normalizeGoogleCalendar({ summary: "No id" })).toBeNull();
    expect(normalizeGoogleCalendar({ id: "no-summary" })).toBeNull();
  });
});

describe("buildGoogleEventsUrl", () => {
  it("encodes the calendar id and time window", () => {
    const url = buildGoogleEventsUrl(
      "team@group.calendar.google.com",
      new Date("2026-06-01T00:00:00Z"),
      new Date("2026-12-01T00:00:00Z"),
    );
    expect(url.pathname).toContain(encodeURIComponent("team@group.calendar.google.com"));
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect(url.searchParams.get("orderBy")).toBe("startTime");
    expect(url.searchParams.get("timeMin")).toBe("2026-06-01T00:00:00.000Z");
  });
});
