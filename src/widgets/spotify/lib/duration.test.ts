import { describe, expect, it } from "vitest";
import { formatDuration, progressLabels } from "@/widgets/spotify/lib/duration";

describe("formatDuration", () => {
  it.each([
    ["reads a track length as minutes and seconds", 203_000, "3:23"],
    ["pads the seconds, so 3:05 does not read as 3:5", 185_000, "3:05"],
    ["floors a negative position to zero rather than showing a minus", -500, "0:00"],
    ["carries past an hour without losing the minutes", 3_723_000, "62:03"],
  ])("%s", (_label, milliseconds, expected) => {
    expect(formatDuration(milliseconds)).toBe(expected);
  });
});

describe("progressLabels", () => {
  it.each([
    ["total" as const, "3:20"],
    ["remaining" as const, "-2:50"],
  ])("shows the elapsed time and the %s time", (mode, rightLabel) => {
    expect(progressLabels(30_000, 200_000, mode)).toEqual({ leftLabel: "0:30", rightLabel });
  });

  it("never counts past the end of the track", () => {
    expect(progressLabels(250_000, 200_000, "remaining").rightLabel).toBe("-0:00");
  });
});
