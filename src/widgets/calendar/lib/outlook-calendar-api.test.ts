import { describe, expect, it } from "vitest";
import {
  normalizeOutlookCalendar,
  normalizeOutlookEvent,
} from "@/widgets/calendar/lib/outlook-calendar-api";

describe("normalizeOutlookEvent", () => {
  it("normalizes a timed event with UTC dateTime and provider provenance", () => {
    const event = normalizeOutlookEvent(
      {
        id: "evt1",
        subject: "Team sync",
        start: { dateTime: "2026-06-16T20:00:00.0000000", timeZone: "UTC" },
        end: { dateTime: "2026-06-16T20:30:00.0000000", timeZone: "UTC" },
        isAllDay: false,
        location: { displayName: "Room A" },
        webLink: "https://outlook.example/item",
      },
      "cal1",
    );

    expect(event).toMatchObject({
      id: "microsoft-cal1-evt1",
      provider: "microsoft",
      title: "Team sync",
      startsAt: "2026-06-16T20:00:00.000Z",
      endsAt: "2026-06-16T20:30:00.000Z",
      location: "Room A",
      sourceUrl: "https://outlook.example/item",
      isAllDay: false,
      visibility: "default",
    });
  });

  it("parses all-day events as a local calendar date without timezone shift", () => {
    const event = normalizeOutlookEvent(
      {
        id: "evt2",
        subject: "Holiday",
        start: { dateTime: "2026-06-19T00:00:00.0000000", timeZone: "UTC" },
        end: { dateTime: "2026-06-20T00:00:00.0000000", timeZone: "UTC" },
        isAllDay: true,
      },
      "cal1",
    );

    const start = new Date(event?.startsAt ?? "");
    expect(event?.isAllDay).toBe(true);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(5);
    expect(start.getDate()).toBe(19);
  });

  it("drops cancelled events and events without an id", () => {
    expect(
      normalizeOutlookEvent({ id: "evt3", isCancelled: true, start: {}, end: {} }, "cal1"),
    ).toBeNull();
    expect(normalizeOutlookEvent({ subject: "No id" }, "cal1")).toBeNull();
  });

  it("falls back to a busy label when the subject is hidden", () => {
    const event = normalizeOutlookEvent(
      {
        id: "evt4",
        start: { dateTime: "2026-06-16T20:00:00.0000000" },
        end: { dateTime: "2026-06-16T21:00:00.0000000" },
      },
      "cal1",
    );
    expect(event?.title).toBe("Busy");
    expect(event?.visibility).toBe("busy");
  });
});

describe("normalizeOutlookCalendar", () => {
  it("uses the hex color and default-calendar selection", () => {
    const calendar = normalizeOutlookCalendar({
      id: "c1",
      name: "Work",
      hexColor: "#FF0000",
      isDefaultCalendar: true,
    });
    expect(calendar).toMatchObject({
      id: "c1",
      summary: "Work",
      backgroundColor: "#FF0000",
      primary: true,
      selected: true,
    });
  });

  it("maps a named color to hex", () => {
    const calendar = normalizeOutlookCalendar({ id: "c2", name: "Personal", color: "lightBlue" });
    expect(calendar?.backgroundColor).toBe("#a6c8ff");
    expect(calendar?.primary).toBe(false);
  });

  it("returns null when id or name is missing", () => {
    expect(normalizeOutlookCalendar({ name: "No id" })).toBeNull();
    expect(normalizeOutlookCalendar({ id: "c3" })).toBeNull();
  });
});
