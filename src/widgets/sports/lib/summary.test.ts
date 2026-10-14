import { describe, expect, it } from "vitest";
import { parseCachedGameSummary, parseGameSummary } from "@/widgets/sports/lib/summary";

const header = (state = "post") => ({
  id: "game",
  competitions: [{ status: { type: { state } } }],
});
const stats = (entries: [string, string][]) =>
  entries.map(([name, displayValue]) => ({ name, displayValue }));
const sides = (away: [string, string][], home: [string, string][]) => [
  { team: { id: "a", abbreviation: "AWY" }, statistics: stats(away) },
  { team: { id: "h", abbreviation: "HME" }, statistics: stats(home) },
];
const play = (id: string, score: boolean, sequence: number) => ({
  id,
  text: `Play ${id}`,
  sequenceNumber: String(sequence),
  period: { number: 1 },
  clock: { displayValue: "1:23" },
  awayScore: 3,
  homeScore: 0,
  scoringPlay: score,
});

describe("game summaries", () => {
  it("keeps NFL paired and possession values rather than interpreting them as numbers", () => {
    const data = parseGameSummary(
      {
        header: header(),
        boxscore: {
          teams: sides(
            [
              ["totalYards", "436"],
              ["thirdDownEff", "2-7"],
              ["possessionTime", "30:08"],
            ],
            [
              ["totalYards", "454"],
              ["thirdDownEff", "7-14"],
              ["possessionTime", "37:57"],
            ],
          ),
        },
      },
      "nfl",
      "a",
      "h",
    );
    expect(data.stats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "totalYards", awayValue: 436, homeValue: 454 }),
        expect.objectContaining({ key: "thirdDownEff", away: "2-7", awayValue: undefined }),
        expect.objectContaining({ key: "possessionTime", home: "37:57", homeValue: undefined }),
      ]),
    );
    expect(parseCachedGameSummary(data)).toEqual(data);
  });

  it("labels pregame statistics as season context and excludes game plays and players", () => {
    const data = parseGameSummary(
      {
        header: header("pre"),
        boxscore: {
          teams: sides(
            [
              ["yardsPerGame", "359.4"],
              ["totalYards", "0"],
            ],
            [
              ["yardsPerGame", "334.6"],
              ["totalYards", "0"],
            ],
          ),
        },
        plays: [play("1", true, 1)],
      },
      "nfl",
      "a",
      "h",
    );
    expect(data.context).toBe("season");
    expect(data.stats.map((stat) => stat.key)).toEqual(["yardsPerGame"]);
    expect(data.plays).toEqual([]);
    expect(data.players).toEqual([]);
  });

  it("combines nested NFL drives with scoring plays without duplicates and retains valid plays", () => {
    const data = parseGameSummary(
      {
        header: header(),
        scoringPlays: [play("2", true, 2)],
        drives: {
          previous: [
            {
              id: "d",
              description: "5 plays, 35 yards",
              displayResult: "Field Goal",
              plays: [play("1", false, 1), { id: "bad" }, play("2", true, 2)],
            },
          ],
        },
      },
      "nfl",
    );
    expect(data.plays.map((play) => play.id)).toEqual(["1", "2"]);
    expect(data.drives[0]?.plays).toHaveLength(2);
    expect(data.plays[1]?.scoring).toBe(true);
    expect(parseCachedGameSummary(data)).toEqual(data);
  });

  it("keeps known zero values, DNP and missing player fields distinct", () => {
    const data = parseGameSummary(
      {
        header: header("in"),
        boxscore: {
          players: [
            {
              team: { id: "a", abbreviation: "AWY" },
              statistics: [
                {
                  keys: ["points", "rebounds"],
                  labels: ["PTS", "REB"],
                  athletes: [
                    { athlete: { id: "p", displayName: "Player One" }, stats: ["0"] },
                    {
                      athlete: { id: "dnp", displayName: "Player Two" },
                      didNotPlay: true,
                      reason: "Inactive",
                      stats: [],
                    },
                    { athlete: "bad" },
                  ],
                },
              ],
            },
          ],
        },
      },
      "nba",
    );
    expect(data.players[0]?.players).toHaveLength(2);
    expect(data.players[0]?.players[0]?.values).toEqual({ points: "0" });
    expect(data.players[0]?.players[1]?.unavailable).toBe("Inactive");
    expect(parseCachedGameSummary(data)).toEqual(data);
  });

  it("does not turn absent team metrics into zeros or accept an unrelated response", () => {
    expect(
      parseGameSummary(
        { header: header(), boxscore: { teams: sides([["fieldGoalPct", "50"]], []) } },
        "nba",
        "a",
        "h",
      ).stats,
    ).toEqual([]);
    expect(() => parseGameSummary({ events: [] }, "nba")).toThrow(
      "Unexpected game detail response",
    );
    expect(parseCachedGameSummary({ eventId: "game" })).toBeNull();
  });
});
