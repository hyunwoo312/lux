import { describe, expect, it } from "vitest";
import { datesParam, LIVE_FLOOR_MS } from "@/widgets/sports/lib/window";

const now = new Date(2026, 7, 8);

describe("datesParam", () => {
  it("asks for no range at all when the window is today", () => {
    expect(datesParam("today", now)).toBeNull();
  });

  it("spans a day either side for the day window", () => {
    expect(datesParam("day", now)).toBe("20260807-20260809");
  });

  it("spans three days either side for the week window", () => {
    expect(datesParam("week", now)).toBe("20260805-20260811");
  });

  it("rolls across a month boundary rather than producing a bad stamp", () => {
    expect(datesParam("day", new Date(2026, 7, 1))).toBe("20260731-20260802");
    expect(datesParam("day", new Date(2026, 11, 31))).toBe("20261230-20270101");
  });

  it("slows the live floor as the range widens, so data use stays flat", () => {
    expect(LIVE_FLOOR_MS.today).toBeLessThan(LIVE_FLOOR_MS.day);
    expect(LIVE_FLOOR_MS.day).toBeLessThan(LIVE_FLOOR_MS.week);
  });
});
