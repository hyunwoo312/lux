import { describe, expect, it } from "vitest";
import { findNowcast, nowcastLabel } from "@/widgets/weather/lib/nowcast";
import type { WeatherMinute } from "@/widgets/weather/types";

function series(entries: Array<[string, number, number]>): WeatherMinute[] {
  return entries.map(([time, precipitation, probability]) => ({
    time,
    precipitation,
    probability,
  }));
}

const DRY: Array<[string, number, number]> = [
  ["2026-08-25T09:00", 0, 5],
  ["2026-08-25T09:15", 0, 8],
  ["2026-08-25T09:30", 0, 10],
];

describe("findNowcast", () => {
  it("reports rain already falling in the current quarter hour", () => {
    const minutes = series([["2026-08-25T09:00", 0.4, 80], ...DRY.slice(1)]);
    expect(findNowcast(minutes, "2026-08-25T09:07", 50)).toEqual({
      startsInMinutes: 0,
      probability: 80,
    });
  });

  it("counts the quarter hours until the first wet bucket", () => {
    const minutes = series([...DRY, ["2026-08-25T09:45", 0.2, 70]]);
    expect(findNowcast(minutes, "2026-08-25T09:00", 50)?.startsInMinutes).toBe(45);
  });

  it("treats a high probability as rain even with no measured amount", () => {
    const minutes = series([...DRY, ["2026-08-25T09:45", 0, 65]]);
    expect(findNowcast(minutes, "2026-08-25T09:00", 50)?.probability).toBe(65);
  });

  it("ignores a shower beyond the two-hour window", () => {
    const minutes = series([
      ...DRY,
      ...Array.from({ length: 5 }, (_, index): [string, number, number] => [
        `2026-08-25T${10 + index}:00`,
        0,
        5,
      ]),
      ["2026-08-25T15:00", 5, 90],
    ]);
    expect(findNowcast(minutes, "2026-08-25T09:00", 50)).toBeNull();
  });

  it("says nothing when the next two hours are dry", () => {
    expect(findNowcast(series(DRY), "2026-08-25T09:00", 50)).toBeNull();
  });

  it("has nothing to say without a minute series", () => {
    expect(findNowcast([], "2026-08-25T09:00", 50)).toBeNull();
  });

  it("has nothing to say once the series is in the past", () => {
    expect(findNowcast(series(DRY), "2026-08-25T23:00", 50)).toBeNull();
  });

  it("respects a lower threshold for people who want the warning early", () => {
    const minutes = series([...DRY, ["2026-08-25T09:45", 0, 35]]);
    expect(findNowcast(minutes, "2026-08-25T09:00", 30)?.probability).toBe(35);
  });
});

describe("nowcastLabel", () => {
  it.each([
    [0, "Rain now"],
    [15, "Rain in ~15 min"],
    [45, "Rain in ~45 min"],
    [90, "Rain in ~2h"],
  ])("turns %s minutes into %s", (startsInMinutes, expected) => {
    expect(nowcastLabel({ startsInMinutes, probability: 70 })).toBe(expected);
  });
});
