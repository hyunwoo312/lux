import { describe, expect, it } from "vitest";
import { datesParam, DAY_WINDOWS, livePollFloorMs } from "@/widgets/sports/lib/window";

const now = new Date(2026, 7, 8);

describe("datesParam", () => {
  it("widens the span with the window, and asks for no range at all on today", () => {
    expect(datesParam("today", now)).toBeNull();
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
