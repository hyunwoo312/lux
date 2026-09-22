import { describe, expect, it } from "vitest";
import { dateFromDayKey, localDayKey, nextReelTarget } from "@/lib/clock";

describe("localDayKey", () => {
  it("reads the day in the viewer's own timezone, not UTC", () => {
    expect(localDayKey(new Date(2026, 7, 23, 23, 30))).toBe("2026-08-23");
    expect(localDayKey(new Date(2026, 0, 5, 0, 15))).toBe("2026-01-05");
  });
});

describe("dateFromDayKey", () => {
  it("returns the local day a key names, and nothing for a key it did not write", () => {
    expect(dateFromDayKey("2026-08-29")).toEqual(new Date(2026, 7, 29));
    expect(dateFromDayKey("2026-7-29")).toBeNull();
    expect(dateFromDayKey("2026-02-31")).toBeNull();
    expect(dateFromDayKey("2026-13-01")).toBeNull();
  });
});

describe("nextReelTarget", () => {
  it("keeps rolling one step forward however far the reel has already turned", () => {
    expect(nextReelTarget(9, 0)).toBe(10);
    expect(nextReelTarget(19, 0)).toBe(20);
    expect(nextReelTarget(129, 0)).toBe(130);
  });

  it("takes the short way back when that is nearer", () => {
    expect(nextReelTarget(21, 9)).toBe(19);
  });
});
