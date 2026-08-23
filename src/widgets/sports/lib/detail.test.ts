import { describe, expect, it } from "vitest";
import { hasMatchDetail, peopleFor } from "@/widgets/sports/lib/detail";
import { match as baseMatch, team as baseTeam } from "@/widgets/sports/lib/fixtures";
import type { Match, MatchState, MatchTeam } from "@/widgets/sports/types";

function team(overrides: Partial<MatchTeam> = {}): MatchTeam {
  return baseTeam({ abbreviation: "MTL", name: "Canadiens", score: null, ...overrides });
}

function match(state: MatchState, overrides: Partial<Match> = {}): Match {
  return baseMatch({
    state,
    detail: "7:30 PM",
    startsAt: "2026-09-19T23:00Z",
    away: team(),
    home: team({ abbreviation: "TOR" }),
    ...overrides,
  });
}

describe("hasMatchDetail", () => {
  it("is true once there is anything worth showing", () => {
    expect(hasMatchDetail(match("pre", { venue: "Bell Centre" }))).toBe(true);
    expect(hasMatchDetail(match("pre", { link: "https://espn.com/g/1" }))).toBe(true);
    expect(hasMatchDetail(match("pre", { away: team({ record: "2-1" }) }))).toBe(true);
    expect(hasMatchDetail(match("pre", { away: team({ probable: "S. Lugo" }) }))).toBe(true);
    expect(hasMatchDetail(match("in", { home: team({ periods: ["1"] }) }))).toBe(true);
  });
});

describe("peopleFor", () => {
  it("offers probable starters before a game", () => {
    const people = peopleFor(
      match("pre", {
        away: team({ probable: "S. Lugo" }),
        home: team({ abbreviation: "TOR", probable: "G. Cole" }),
      }),
    );

    expect(people.map((person) => person.name)).toEqual(["S. Lugo", "G. Cole"]);
    expect(people.every((person) => person.label === undefined)).toBe(true);
  });

  it("skips a side with no announced starter rather than rendering a blank row", () => {
    const people = peopleFor(match("pre", { away: team({ probable: "S. Lugo" }) }));

    expect(people).toHaveLength(1);
  });

  it("switches to game leaders once the game is under way", () => {
    const people = peopleFor(
      match("in", {
        away: team({ leaders: [{ label: "AVG", athlete: "N. Sogard", detail: "3-4" }] }),
      }),
    );

    expect(people).toEqual([{ logo: undefined, label: "AVG", name: "N. Sogard", detail: "3-4" }]);
  });
});
