import { describe, expect, it } from "vitest";
import { LEAGUES, leaguesBySport } from "@/widgets/sports/lib/leagues";

describe("league registry", () => {
  it("gives every league a unique id", () => {
    const ids = LEAGUES.map((league) => league.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sends every tennis tour down the draw branch", () => {
    for (const league of leaguesBySport("tennis")) expect(league.kind).toBe("draw");
  });

  it("sends every golf league down the leaderboard branch", () => {
    for (const league of leaguesBySport("golf")) expect(league.kind).toBe("leaderboard");
  });
});
