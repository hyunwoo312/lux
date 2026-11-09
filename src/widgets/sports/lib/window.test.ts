import { describe, expect, it } from "vitest";
import { match } from "@/widgets/sports/lib/fixtures";
import {
  datesParam,
  DAY_WINDOWS,
  livePollFloorMs,
  untilNextStartMs,
} from "@/widgets/sports/lib/window";

const now = new Date(2026, 7, 8);

describe("datesParam", () => {
  it("widens the span with the window and keeps today to its local date", () => {
    expect(datesParam("today", now)).toBe("20260808-20260808");
    expect(datesParam("day", now)).toBe("20260807-20260809");
    expect(datesParam("week", now)).toBe("20260805-20260811");
    expect(datesParam("wide", now)).toBe("20260801-20260815");
  });

  it("rolls across a month and a year boundary rather than producing a bad stamp", () => {
    expect(datesParam("day", new Date(2026, 7, 1))).toBe("20260731-20260802");
    expect(datesParam("day", new Date(2026, 11, 31))).toBe("20261230-20270101");
  });
});

describe("livePollFloorMs", () => {
  it("backs off monotonically as the range widens, so data use stays flat", () => {
    const floors = DAY_WINDOWS.map((window) => livePollFloorMs("basketball", window));
    expect(floors).toEqual([...floors].sort((a, b) => a - b));
    expect(new Set(floors).size).toBe(DAY_WINDOWS.length);
  });

  it("polls a sport that scores constantly faster than one that rarely does", () => {
    expect(livePollFloorMs("basketball", "today")).toBeLessThan(livePollFloorMs("soccer", "today"));
    expect(livePollFloorMs("soccer", "today")).toBeLessThan(livePollFloorMs("golf", "today"));
  });
});

describe("untilNextStartMs", () => {
  const at = Date.parse("2026-08-08T18:00:00Z");
  const scheduled = (minutes: number) =>
    match({
      id: String(minutes),
      state: "pre",
      startsAt: new Date(at + minutes * 60_000).toISOString(),
    });

  it("counts down to the soonest scheduled game", () => {
    expect(untilNextStartMs([scheduled(40), scheduled(10)], at)).toBe(10 * 60_000);
  });

  it("is due now for a game past its start that ESPN still lists as scheduled", () => {
    expect(untilNextStartMs([scheduled(-3)], at)).toBe(0);
  });

  it("has nothing to wait for once no game is scheduled", () => {
    expect(untilNextStartMs([match({ state: "post" })], at)).toBeNull();
  });
});
