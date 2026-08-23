import { describe, expect, it } from "vitest";
import { searchTeamIndex, type IndexedTeam } from "@/widgets/sports/lib/teamIndex";

function team(leagueId: string, abbreviation: string, name: string): IndexedTeam {
  return { leagueId, abbreviation, name };
}

const INDEX: IndexedTeam[] = [
  team("mlb", "NYY", "Yankees"),
  team("mlb", "NYM", "Mets"),
  team("epl", "ARS", "Arsenal"),
  team("epl", "AVL", "Aston Villa"),
  team("nba", "NYK", "Knicks"),
];

describe("searchTeamIndex", () => {
  it("finds a team by the start of its name", () => {
    expect(searchTeamIndex(INDEX, "ars", 10).map((entry) => entry.name)).toEqual(["Arsenal"]);
  });

  it("finds a team by its abbreviation", () => {
    expect(searchTeamIndex(INDEX, "nym", 10).map((entry) => entry.name)).toEqual(["Mets"]);
  });

  it("reaches across every league, not just one", () => {
    const leagues = searchTeamIndex(INDEX, "n", 10).map((entry) => entry.leagueId);
    expect(new Set(leagues).size).toBeGreaterThan(1);
  });

  it("puts an exact abbreviation ahead of a team merely named that way", () => {
    const found = searchTeamIndex([team("x", "ARR", "Arsenal Reserves"), ...INDEX], "ars", 10);

    expect(found.map((entry) => entry.abbreviation)).toEqual(["ARS", "ARR"]);
  });

  it("matches a word inside the name, not only its start", () => {
    expect(searchTeamIndex(INDEX, "villa", 10).map((entry) => entry.name)).toEqual(["Aston Villa"]);
  });

  it("returns nothing for an empty query rather than the whole index", () => {
    expect(searchTeamIndex(INDEX, "   ", 10)).toEqual([]);
  });

  it("stops at the limit it is given", () => {
    expect(searchTeamIndex(INDEX, "n", 2)).toHaveLength(2);
  });
});
