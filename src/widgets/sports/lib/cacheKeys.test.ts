import { describe, expect, it } from "vitest";
import { scoreboardKey } from "@/widgets/sports/lib/cacheKeys";
import { leagueById, type League } from "@/widgets/sports/lib/leagues";

const MLB = leagueById("mlb") as League;
const PGA = leagueById("pga") as League;

describe("cache keys", () => {
  it("separates a league's day ranges, so widening does not read the narrow slate", () => {
    expect(scoreboardKey(MLB, "today")).not.toBe(scoreboardKey(MLB, "week"));
  });

  it("gives a tour one key, since its range is the tournament", () => {
    expect(scoreboardKey(PGA, "today")).toBe(scoreboardKey(PGA, "week"));
  });
});
