import { describe, expect, it } from "vitest";
import { match } from "@/widgets/sports/lib/fixtures";
import { matchStatus, offseasonStart } from "@/widgets/sports/lib/status";

describe("matchStatus", () => {
  const now = new Date(2026, 7, 7, 12, 0).getTime();

  it("uses ESPN's own wording for a live game", () => {
    const live = match({ state: "in", detail: "40.1 - 4th" });

    expect(matchStatus(live, now, true)).toBe("40.1 - 4th");
  });

  it("keeps Final explicit instead of inventing an elapsed finish time", () => {
    const done = match({ state: "post", detail: "FT" });
    expect(matchStatus(done, Date.parse(done.startsAt) + 2 * 60 * 60_000, true)).toBe("Final");
    expect(matchStatus(done, Date.parse(done.startsAt) + 30 * 24 * 60 * 60_000, true)).toBe(
      "Final",
    );
  });

  it("keeps a finish that carries more than 'it ended'", () => {
    const done = match({ state: "post", detail: "Postponed" });

    expect(matchStatus(done, now, true)).toBe("Postponed");
  });

  it("replaces ESPN's US-timezone kickoff string with a local time", () => {
    const start = new Date(2026, 7, 7, 19, 40);
    const upcoming = match({
      state: "pre",
      detail: "8/7 - 9:40 PM EDT",
      startsAt: start.toISOString(),
    });

    const status = matchStatus(upcoming, now, true);

    expect(status).not.toContain("EDT");
    expect(status).toBe(
      start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true }),
    );
  });

  it("counts down rather than printing a clock time for an imminent game", () => {
    const start = new Date(2026, 7, 7, 12, 25);
    const upcoming = match({ state: "pre", detail: "12:25 PM EDT", startsAt: start.toISOString() });

    expect(matchStatus(upcoming, now, true)).toBe("in 25m");
  });

  it("shows a calendar date for a fixture further out than a week", () => {
    const start = new Date(2026, 8, 19, 19, 0);
    const upcoming = match({
      state: "pre",
      detail: "9/19 - 7:00 PM",
      startsAt: start.toISOString(),
    });

    const status = matchStatus(upcoming, now, true);

    expect(status).toContain(
      start.toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
    );
    expect(status).not.toMatch(/^\w{3}\s/);
  });

  it("adds a weekday once the fixture is not today", () => {
    const start = new Date(2026, 7, 9, 19, 40);
    const upcoming = match({
      state: "pre",
      detail: "8/9 - 7:40 PM",
      startsAt: start.toISOString(),
    });

    expect(matchStatus(upcoming, now, true)).toMatch(/^\w{3}\s/);
  });

  it("renders a scheduled kickoff in 12- or 24-hour time", () => {
    const start = new Date(2026, 7, 7, 18, 30);
    const upcoming = match({ state: "pre", detail: "6:30 PM EDT", startsAt: start.toISOString() });
    const fiveHoursBefore = start.getTime() - 5 * 60 * 60_000;

    expect(matchStatus(upcoming, fiveHoursBefore, true)).toMatch(/AM|PM/);
    expect(matchStatus(upcoming, fiveHoursBefore, false)).not.toMatch(/AM|PM/);
  });

  it("preserves overtime and a postponed upcoming fixture", () => {
    expect(matchStatus(match({ state: "post", detail: "Final/OT" }), now, true)).toBe("Final/OT");
    expect(matchStatus(match({ state: "pre", detail: "Postponed" }), now, true)).toBe("Postponed");
  });
});

describe("offseasonStart", () => {
  const now = new Date(2026, 7, 8, 12, 0).getTime();
  const fixture = (id: string, day: Date) =>
    match({ id, state: "pre", detail: "7:00 PM", startsAt: day.toISOString() });

  it("reports the return date when every fixture is more than a week out", () => {
    const matches = [fixture("1", new Date(2026, 8, 19)), fixture("2", new Date(2026, 8, 20))];

    expect(offseasonStart(matches, now)?.getMonth()).toBe(8);
    expect(offseasonStart(matches, now)?.getDate()).toBe(19);
  });

  it("is not off-season when a fixture is close at hand", () => {
    expect(offseasonStart([fixture("1", new Date(2026, 7, 9))], now)).toBeNull();
  });

  it("is not off-season while any game is live or finished", () => {
    const matches = [match({ id: "1", state: "in" }), fixture("2", new Date(2026, 8, 19))];

    expect(offseasonStart(matches, now)).toBeNull();
  });

  it("says nothing about an empty slate", () => {
    expect(offseasonStart([], now)).toBeNull();
  });
});
