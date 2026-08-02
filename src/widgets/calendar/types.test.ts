import { describe, expect, it } from "vitest";
import { calendarEventSchema } from "@/widgets/calendar/types";

describe("calendarEventSchema back-compat", () => {
  it("parses an event cached before joinUrl/rsvp existed", () => {
    const legacy = {
      id: "google-c-1", calendarId: "c", provider: "google", title: "Old",
      startsAt: "2026-08-04T09:00:00Z", endsAt: "2026-08-04T10:00:00Z",
      isAllDay: false, visibility: "default",
    };
    const parsed = calendarEventSchema.safeParse(legacy);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.joinUrl).toBeUndefined();
    expect(parsed.success && parsed.data.rsvp).toBeUndefined();
  });

  it("rejects an unknown rsvp value rather than trusting it", () => {
    const bad = {
      id: "google-c-1", calendarId: "c", title: "X",
      startsAt: "2026-08-04T09:00:00Z", endsAt: "2026-08-04T10:00:00Z",
      isAllDay: false, visibility: "default", rsvp: "maybe-later",
    };
    expect(calendarEventSchema.safeParse(bad).success).toBe(false);
  });
});
