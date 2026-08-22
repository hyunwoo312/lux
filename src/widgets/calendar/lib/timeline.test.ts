import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  getRangeStart,
  formatSkipLabel,
  describeNextAfterToday,
  formatDuration,
  getEventCountdown,
  formatGapLabel,
  getEventUrgency,
  getFreeGaps,
  getHourMarks,
  getWindowStart,
  packEventLanes,
  splitTimelineEvents,
} from "@/widgets/calendar/lib/timeline";
import type { CalendarEvent } from "@/widgets/calendar/types";

function at(hour: number, minute = 0, dayOffset = 0): Date {
  const date = new Date(2026, 7, 23, hour, minute, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date;
}

function event(over: Partial<CalendarEvent> & { id: string; from: Date; to: Date }): CalendarEvent {
  const { from, to, ...rest } = over;
  return {
    calendarId: "primary",
    title: rest.id,
    isAllDay: false,
    visibility: "default",
    ...rest,
    startsAt: from.toISOString(),
    endsAt: to.toISOString(),
  };
}

describe("getWindowStart", () => {
  it("floors the current time to the hour", () => {
    expect(getWindowStart(at(9, 47))).toEqual(at(9, 0));
  });
});

describe("getHourMarks", () => {
  it("labels every hour boundary including the window end", () => {
    const marks = getHourMarks({ start: at(9), end: at(12), minutes: 180 });
    expect(marks).toEqual([at(9), at(10), at(11), at(12)]);
  });
});

describe("packEventLanes", () => {
  it("keeps sequential events in a single lane and flags no conflict", () => {
    const blocks = packEventLanes(
      [event({ id: "a", from: at(9), to: at(10) }), event({ id: "b", from: at(10), to: at(11) })],
      at(9),
    );

    expect(blocks.map((block) => [block.event.id, block.lane, block.laneCount])).toEqual([
      ["a", 0, 1],
      ["b", 0, 1],
    ]);
    expect(blocks.every((block) => !block.conflicting)).toBe(true);
  });

  it("puts overlapping events side by side and flags both as conflicting", () => {
    const blocks = packEventLanes(
      [
        event({ id: "a", from: at(9), to: at(10) }),
        event({ id: "b", from: at(9, 30), to: at(10, 30) }),
      ],
      at(9),
    );

    expect(blocks.map((block) => [block.event.id, block.lane, block.laneCount])).toEqual([
      ["a", 0, 2],
      ["b", 1, 2],
    ]);
    expect(blocks.every((block) => block.conflicting)).toBe(true);
  });

  it("only widens the lane count for the contended cluster", () => {
    const blocks = packEventLanes(
      [
        event({ id: "a", from: at(9), to: at(10) }),
        event({ id: "b", from: at(9, 30), to: at(10, 30) }),
        event({ id: "solo", from: at(14), to: at(15) }),
      ],
      at(9),
    );

    expect(blocks.find((block) => block.event.id === "solo")).toMatchObject({
      lane: 0,
      laneCount: 1,
      conflicting: false,
    });
  });

  it("marks only the events that truly overlap inside a cluster", () => {
    const blocks = packEventLanes(
      [
        event({ id: "a", from: at(9), to: at(10) }),
        event({ id: "b", from: at(10), to: at(11) }),
        event({ id: "c", from: at(9, 30), to: at(10, 30) }),
      ],
      at(9),
    );

    const conflicting = blocks.filter((block) => block.conflicting).map((block) => block.event.id);
    expect(conflicting.sort()).toEqual(["a", "b", "c"]);
    expect(blocks.every((block) => block.laneCount === 2)).toBe(true);
  });

  it("reuses a freed lane once an event has ended", () => {
    const blocks = packEventLanes(
      [
        event({ id: "a", from: at(9), to: at(11) }),
        event({ id: "b", from: at(9, 30), to: at(10) }),
        event({ id: "c", from: at(10), to: at(10, 30) }),
      ],
      at(9),
    );

    expect(blocks.find((block) => block.event.id === "c")?.lane).toBe(1);
  });

  it("measures offsets in minutes from the window start", () => {
    const blocks = packEventLanes([event({ id: "a", from: at(9, 30), to: at(10, 15) })], at(9));
    expect(blocks[0]).toMatchObject({ startMin: 30, endMin: 75 });
  });
});

describe("getFreeGaps", () => {
  it("reports the space between two events", () => {
    const gaps = getFreeGaps(
      [
        { startMin: 0, endMin: 60 },
        { startMin: 180, endMin: 240 },
      ],
      300,
      0,
    );
    expect(gaps).toEqual([
      { startMin: 60, endMin: 180, minutes: 120, trailing: false },
      { startMin: 240, endMin: 300, minutes: 60, trailing: true },
    ]);
  });

  it("never reports time that has already passed", () => {
    const gaps = getFreeGaps([{ startMin: 180, endMin: 240 }], 300, 120);
    expect(gaps[0]).toMatchObject({ startMin: 120, endMin: 180 });
  });

  it("merges overlapping busy spans", () => {
    const gaps = getFreeGaps(
      [
        { startMin: 0, endMin: 90 },
        { startMin: 60, endMin: 150 },
      ],
      240,
      0,
    );
    expect(gaps).toEqual([{ startMin: 150, endMin: 240, minutes: 90, trailing: true }]);
  });

  it("drops gaps too short to be worth naming", () => {
    expect(
      getFreeGaps(
        [
          { startMin: 0, endMin: 60 },
          { startMin: 70, endMin: 120 },
        ],
        120,
        0,
      ),
    ).toEqual([]);
  });
});

describe("getEventUrgency", () => {
  const soon = event({ id: "soon", from: at(10), to: at(11) });

  it.each([
    [at(10, 30), "now"],
    [at(9, 50), "imminent"],
    [at(9, 30), "soon"],
    [at(8), "later"],
    [at(12), "past"],
  ])("reads %s as %s", (now, expected) => {
    expect(getEventUrgency(soon, now)).toBe(expected);
  });

  it("treats an all-day event as later, never as urgent", () => {
    const allDay = event({ id: "offsite", from: at(0), to: at(23, 59), isAllDay: true });

    expect(getEventUrgency(allDay, at(10))).toBe("later");
  });
});

describe("formatDuration", () => {
  it.each([
    [45, "45m"],
    [60, "1h"],
    [150, "2h 30m"],
  ])("formats %i minutes as %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

describe("formatGapLabel", () => {
  const axis = { start: at(9), end: at(12), minutes: 180 };

  it("names the time the free space runs out", () => {
    const label = formatGapLabel(
      { startMin: 0, endMin: 120, minutes: 120, trailing: false },
      axis,
      false,
    );
    expect(label).toContain("2h free until");
    expect(label).toContain("11");
  });

  it("says nothing else is scheduled for a trailing gap", () => {
    const label = formatGapLabel(
      { startMin: 0, endMin: 120, minutes: 120, trailing: true },
      axis,
      false,
    );
    expect(label).toBe("2h free — nothing else today");
  });
});

describe("describeNextAfterToday", () => {
  it("names tomorrow's first event", () => {
    const label = describeNextAfterToday(
      [event({ id: "Retro", from: at(9, 0, 1), to: at(10, 0, 1) })],
      at(20),
      false,
    );

    expect(label).toContain("Next up: Retro, tomorrow at");
  });

  it.each([
    ["a clear calendar", [] as ReturnType<typeof event>[]],
    ["an event still to come today", [event({ id: "later", from: at(22), to: at(23) })]],
  ])("says nothing for %s", (_label, events) => {
    expect(describeNextAfterToday(events, at(20), false)).toBeNull();
  });
});

describe("getEventCountdown", () => {
  const now = new Date("2026-08-23T12:00:00.000Z");
  const between = (startIso: string, endIso: string) =>
    ({
      id: "e",
      calendarId: "c",
      title: "T",
      startsAt: startIso,
      endsAt: endIso,
      isAllDay: false,
      visibility: "default",
    }) as CalendarEvent;

  it.each([
    ["19:00", "20:00", null],
    ["12:20", "13:00", "in 20m"],
    ["11:50", "12:30", "now"],
    ["10:00", "11:00", null],
  ])("counts %s-%s as %s", (from, to, expected) => {
    const event = between(`2026-08-23T${from}:00.000Z`, `2026-08-23T${to}:00.000Z`);

    expect(getEventCountdown(event, now)).toBe(expected);
  });
});

describe("buildTimeline", () => {
  const now = new Date("2026-08-23T12:20:00.000Z");
  const ev = (id: string, startIso: string, endIso: string) =>
    ({
      id,
      calendarId: "c",
      title: id,
      startsAt: startIso,
      endsAt: endIso,
      isAllDay: false,
      visibility: "default",
    }) as CalendarEvent;

  it("opens on an axis at the current hour even with nothing scheduled", () => {
    const segments = buildTimeline([], getWindowStart(now), now);
    expect(segments).toHaveLength(1);
    expect(segments[0]?.kind).toBe("run");
    expect((segments[0] as { start: Date }).start.getHours()).toBe(now.getHours());
  });

  it("keeps a short gap on the axis instead of eliding it", () => {
    const segments = buildTimeline(
      [ev("a", "2026-08-23T13:00:00.000Z", "2026-08-23T13:30:00.000Z")],
      getWindowStart(now),
      now,
    );
    expect(segments.every((segment) => segment.kind === "run")).toBe(true);
  });

  it("elides a long empty stretch and resumes at the next event", () => {
    const segments = buildTimeline(
      [ev("later", "2026-08-23T21:00:00.000Z", "2026-08-23T22:00:00.000Z")],
      getWindowStart(now),
      now,
    );

    expect(segments.map((segment) => segment.kind)).toEqual(["run", "skip", "run"]);
    const skip = segments[1] as { to: Date };
    expect(skip.to.getHours()).toBe(new Date("2026-08-23T21:00:00.000Z").getHours());
  });

  it("always breaks the axis at a day boundary", () => {
    const segments = buildTimeline(
      [
        ev("today", "2026-08-23T13:00:00.000Z", "2026-08-23T14:00:00.000Z"),
        ev("tomorrow", "2026-08-24T09:00:00.000Z", "2026-08-24T10:00:00.000Z"),
      ],
      getWindowStart(now),
      now,
    );

    expect(segments.map((segment) => segment.kind)).toEqual(["run", "skip", "run"]);
    const second = segments[2] as { day: Date };
    expect(second.day.getDate()).toBe(24);
  });
});

describe("formatSkipLabel", () => {
  const now = new Date("2026-08-23T12:00:00.000Z");
  const skip = (fromIso: string, toIso: string) =>
    ({ kind: "skip", from: new Date(fromIso), to: new Date(toIso), minutes: 0 }) as const;

  it("does not claim tomorrow for a gap inside one day", () => {
    const label = formatSkipLabel(
      skip("2026-08-24T10:30:00.000Z", "2026-08-24T18:00:00.000Z"),
      now,
      true,
    );
    expect(label).not.toMatch(/tomorrow/);
    expect(label).toMatch(/^Nothing until/);
  });

  it("names tomorrow when the gap actually crosses into it", () => {
    expect(
      formatSkipLabel(skip("2026-08-23T16:00:00.000Z", "2026-08-24T09:00:00.000Z"), now, true),
    ).toMatch(/tomorrow/);
  });
});

describe("getRangeStart", () => {
  const now = new Date("2026-08-23T14:30:00.000Z");

  it("opens at the current hour when the range covers today", () => {
    const start = getRangeStart(new Date(now), now);
    expect(start.getHours()).toBe(now.getHours());
    expect(start.getMinutes()).toBe(0);
  });

  it("opens at the start of the day when the range begins later", () => {
    const anchor = new Date(now);
    anchor.setDate(anchor.getDate() + 4);
    anchor.setHours(9, 15, 0, 0);

    const start = getRangeStart(anchor, now);

    expect(start.getDate()).toBe(anchor.getDate());
    expect(start.getHours()).toBe(0);
  });
});

describe("buildTimeline over a picked range", () => {
  const now = new Date("2026-08-23T14:30:00.000Z");
  const ev = (id: string, startIso: string, endIso: string) =>
    ({
      id,
      calendarId: "c",
      title: id,
      startsAt: startIso,
      endsAt: endIso,
      isAllDay: false,
      visibility: "default",
    }) as CalendarEvent;

  const localAt = (dayOffset: number, hour: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hour, 0, 0, 0);
    return date;
  };

  it("skips the empty small hours of a future range and opens on its first event", () => {
    const rangeStart = getRangeStart(localAt(4, 0), now);
    const segments = buildTimeline(
      [ev("later", localAt(4, 9).toISOString(), localAt(4, 10).toISOString())],
      rangeStart,
      now,
    );

    expect(segments[0]?.kind).toBe("run");
    expect((segments[0] as { start: Date }).start.getHours()).toBe(9);
  });

  it("only keeps events inside the picked range", () => {
    const rangeStart = getRangeStart(localAt(4, 0), now);
    const { timed } = splitTimelineEvents(
      [
        ev("inside", localAt(4, 9).toISOString(), localAt(4, 10).toISOString()),
        ev("before", localAt(1, 9).toISOString(), localAt(1, 10).toISOString()),
      ],
      rangeStart,
      3,
    );

    expect(timed.map((event) => event.id)).toEqual(["inside"]);
  });
});
