import { describe, expect, it } from "vitest";
import { formatDuration, progressLabels } from "@/widgets/spotify/lib/duration";

describe("formatDuration", () => {
  it("reads a track length as minutes and seconds", () => {
    expect(formatDuration(203_000)).toBe("3:23");
  });

  it("pads the seconds, so 3:05 does not read as 3:5", () => {
    expect(formatDuration(185_000)).toBe("3:05");
  });

  it("floors a negative position to zero rather than showing a minus", () => {
    expect(formatDuration(-500)).toBe("0:00");
  });

  it("carries past an hour without losing the minutes", () => {
    expect(formatDuration(3_723_000)).toBe("62:03");
  });
});

describe("progressLabels", () => {
  it("shows elapsed and total by default", () => {
    expect(progressLabels(30_000, 200_000, "total")).toEqual({
      leftLabel: "0:30",
      rightLabel: "3:20",
    });
  });

  it("counts down when asked for remaining", () => {
    expect(progressLabels(30_000, 200_000, "remaining").rightLabel).toBe("-2:50");
  });

  it("never counts past the end of the track", () => {
    expect(progressLabels(250_000, 200_000, "remaining").rightLabel).toBe("-0:00");
  });
});
