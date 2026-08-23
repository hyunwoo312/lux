import { describe, expect, it } from "vitest";
import { pickEventIndex } from "@/widgets/sports/lib/pickEvent";

const day = (n: number) => new Date(2026, 7, n).toISOString();

describe("pickEventIndex", () => {
  it("prefers a tournament in play over one that has not started", () => {
    expect(
      pickEventIndex([
        { state: "pre", startsAt: day(20) },
        { state: "in", startsAt: day(24) },
      ]),
    ).toBe(1);
  });

  it("takes the soonest of several still to come", () => {
    expect(
      pickEventIndex([
        { state: "pre", startsAt: day(28) },
        { state: "pre", startsAt: day(25) },
      ]),
    ).toBe(1);
  });

  it("takes the most recent of several already finished", () => {
    expect(
      pickEventIndex([
        { state: "post", startsAt: day(10) },
        { state: "post", startsAt: day(22) },
      ]),
    ).toBe(1);
  });

  it("reports nothing to show for an empty list", () => {
    expect(pickEventIndex([])).toBe(-1);
  });

  it("copes with a tournament that carries no date", () => {
    expect(pickEventIndex([{ state: "pre" }, { state: "in" }])).toBe(1);
  });
});
