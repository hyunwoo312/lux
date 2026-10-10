// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTeamIndex, searchTeamIndex, type IndexedTeam } from "@/widgets/sports/lib/teamIndex";
import { fetchTeams } from "@/widgets/sports/lib/espn";
import { LEAGUES } from "@/widgets/sports/lib/leagues";

vi.mock("@/widgets/sports/lib/espn", async (original) => ({
  ...(await original<typeof import("@/widgets/sports/lib/espn")>()),
  fetchTeams: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

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

describe("fetchTeamIndex", () => {
  it("reports a total outage instead of caching an empty success", async () => {
    vi.mocked(fetchTeams).mockRejectedValue(new Error("ESPN unavailable"));
    await expect(fetchTeamIndex()).rejects.toThrow("ESPN unavailable");
  });

  it("keeps available teams and retries only the missing league", async () => {
    const load = vi.mocked(fetchTeams).mockImplementation(async (path) => {
      if (path === "basketball/nba") throw new Error("NBA unavailable");
      return [{ abbreviation: "T", name: path }];
    });
    const partial = await fetchTeamIndex();
    expect(partial.missing).toEqual(["nba"]);
    expect(partial.teams.some((team) => team.leagueId === "nfl")).toBe(true);
    load.mockResolvedValue([{ abbreviation: "DAL", name: "Mavericks" }]);
    const recovered = await fetchTeamIndex();
    expect(recovered.missing).toEqual([]);
    expect(recovered.teams.some((team) => team.abbreviation === "DAL")).toBe(true);
    expect(load).toHaveBeenCalledTimes(
      LEAGUES.filter((league) => league.kind === "match").length + 1,
    );
  });
});

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
