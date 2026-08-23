import { describe, expect, it } from "vitest";
import { parseLeaderboard } from "@/widgets/sports/lib/golf";

type RawPlayer = { id: string; order: number; score: string; rounds: number };

function player({ id, order, score, rounds }: RawPlayer) {
  return {
    id,
    order,
    athlete: { shortName: `P. ${id}`, flag: { href: `https://flags/${id}.png` } },
    score,
    linescores: Array.from({ length: rounds }, (_, index) => ({ displayValue: `-${index + 1}` })),
  };
}

function board(
  players: RawPlayer[],
  { state = "post", period = 4 }: { state?: string; period?: number } = {},
) {
  return {
    events: [
      {
        id: "t1",
        name: "The Open Championship",
        shortName: "The Open",
        date: "2026-08-20T12:00Z",
        status: { type: { state } },
        links: [{ href: "https://espn.com/golf/leaderboard" }],
        competitions: [
          {
            status: { period, type: { detail: state === "post" ? "Final" : `Round ${period}` } },
            competitors: players.map(player),
          },
        ],
      },
    ],
  };
}

describe("parseLeaderboard", () => {
  it("numbers the field from the leader down", () => {
    const result = parseLeaderboard(
      board([
        { id: "a", order: 1, score: "-17", rounds: 4 },
        { id: "b", order: 2, score: "-14", rounds: 4 },
        { id: "c", order: 3, score: "-9", rounds: 4 },
      ]),
    );

    expect(result?.players.map((entry) => entry.position)).toEqual(["1", "2", "3"]);
  });

  it("marks players who share a score as tied", () => {
    const result = parseLeaderboard(
      board([
        { id: "a", order: 1, score: "-17", rounds: 4 },
        { id: "b", order: 2, score: "-12", rounds: 4 },
        { id: "c", order: 3, score: "-12", rounds: 4 },
        { id: "d", order: 4, score: "-9", rounds: 4 },
      ]),
    );

    expect(result?.players.map((entry) => entry.position)).toEqual(["1", "T2", "T2", "4"]);
  });

  it("leaves a player who missed the cut out of the numbering", () => {
    const result = parseLeaderboard(
      board([
        { id: "a", order: 1, score: "-17", rounds: 4 },
        { id: "b", order: 2, score: "-9", rounds: 4 },
        { id: "c", order: 80, score: "+4", rounds: 2 },
      ]),
    );

    expect(result?.players.map((entry) => entry.position)).toEqual(["1", "2", ""]);
    expect(result?.players.at(-1)?.madeCut).toBe(false);
  });

  it("counts nobody out while the tournament is still being played", () => {
    const result = parseLeaderboard(
      board(
        [
          { id: "a", order: 1, score: "-6", rounds: 2 },
          { id: "b", order: 2, score: "-4", rounds: 1 },
        ],
        { state: "in", period: 2 },
      ),
    );

    expect(result?.players.every((entry) => entry.madeCut)).toBe(true);
    expect(result?.players.map((entry) => entry.position)).toEqual(["1", "2"]);
  });

  it("reads the round the tournament has reached", () => {
    const result = parseLeaderboard(
      board([{ id: "a", order: 1, score: "-6", rounds: 3 }], { state: "in", period: 3 }),
    );

    expect(result?.detail).toBe("Round 3");
    expect(result?.players[0]?.today).toBe("-3");
  });

  it("reports no tournament when the tour is between events", () => {
    expect(parseLeaderboard({ events: [] })).toBeNull();
  });

  it("refuses a payload it cannot understand", () => {
    expect(() => parseLeaderboard({ events: [{ name: "The Open" }] })).toThrow();
  });
});
