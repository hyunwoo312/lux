import { describe, expect, it } from "vitest";
import { formatSituation } from "@/widgets/sports/lib/situation";

describe("formatSituation", () => {
  it("reads the count, outs and runners the way a scoreboard would", () => {
    expect(formatSituation({ balls: 0, strikes: 2, outs: 2, bases: [2] })).toBe(
      "0-2, 2 out, runner on 2nd",
    );
  });

  it("names a loaded infield rather than listing every base", () => {
    expect(formatSituation({ balls: 3, strikes: 1, outs: 1, bases: [1, 2, 3] })).toBe(
      "3-1, 1 out, bases loaded",
    );
  });

  it("pluralises multiple runners", () => {
    expect(formatSituation({ outs: 0, bases: [1, 3] })).toBe("0 out, runners on 1st & 3rd");
  });

  it("returns nothing for a sport that reports no situation", () => {
    expect(formatSituation(undefined)).toBeNull();
    expect(formatSituation({ bases: [] })).toBeNull();
  });
});
