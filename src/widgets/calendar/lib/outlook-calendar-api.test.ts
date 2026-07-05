import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations", () => ({ integrationFetch: vi.fn() }));

import { integrationFetch } from "@/integrations";
import {
  fetchOutlookCalendarEvents,
  normalizeOutlookCalendar,
  normalizeOutlookEvent,
} from "@/widgets/calendar/lib/outlook-calendar-api";

const mockFetch = vi.mocked(integrationFetch);

afterEach(() => {
  mockFetch.mockReset();
});

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

describe("fetchOutlookCalendarEvents", () => {
  const graphEvent = (id: string) => ({
    id,
    subject: `Event ${id}`,
    start: { dateTime: "2026-06-16T20:00:00.0000000" },
    end: { dateTime: "2026-06-16T21:00:00.0000000" },
  });

  const pageResponse = (ids: string[], nextLink?: string) =>
    new Response(
      JSON.stringify({ value: ids.map(graphEvent), "@odata.nextLink": nextLink }),
      { status: 200 },
    );

  it("follows @odata.nextLink to collect every page of events", async () => {
    const nextLink = "https://graph.microsoft.com/v1.0/me/calendars/cal1/calendarView?$skip=250";
    mockFetch
      .mockResolvedValueOnce(pageResponse(["e1"], nextLink))
      .mockResolvedValueOnce(pageResponse(["e2"]));

    const result = await fetchOutlookCalendarEvents({
      calendarIds: ["cal1"],
      timeMin: new Date("2026-06-01T00:00:00Z"),
      timeMax: new Date("2026-12-01T00:00:00Z"),
    });

    expect(result.events.map((event) => event.id)).toEqual([
      "microsoft-cal1-e1",
      "microsoft-cal1-e2",
    ]);
    expect(result.failedCalendarIds).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1]?.[1]).toBe(nextLink);
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
