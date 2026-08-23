import { describe, expect, it } from "vitest";
import { parseTennis } from "@/widgets/sports/lib/tennis";

type RawPlayer = { name: string; sets: number[]; winner: boolean; side: "home" | "away" };

function player({ name, sets, winner, side }: RawPlayer) {
  return {
    homeAway: side,
    winner,
    athlete: { shortName: name, flag: { href: `https://flags/${name}.png` } },
    linescores: sets.map((value, index) => ({ value, winner: value > (index % 2 === 0 ? 3 : 5) })),
  };
}

function competition(id: string, state: string, players: RawPlayer[], round = "Round 1") {
  return {
    id,
    date: "2026-08-24T19:35Z",
    round: { displayName: round },
    status: { type: { state, shortDetail: state === "in" ? "1st" : "Final" } },
    competitors: players.map(player),
  };
}

function board(groupings: { id: string; name: string; competitions: unknown[] }[]) {
  return {
    events: [
      {
        name: "Winston-Salem Open",
        shortName: "Winston-Salem",
        status: { type: { state: "in", detail: "In Progress" } },
        links: [{ href: "https://espn.com/tennis" }],
        groupings: groupings.map((group) => ({
          grouping: { id: group.id, displayName: group.name },
          competitions: group.competitions,
        })),
      },
    ],
  };
}

const HERBERT: RawPlayer = { name: "P. Herbert", sets: [6, 4, 6], winner: true, side: "home" };
const MIYOSHI: RawPlayer = { name: "K. Miyoshi", sets: [2, 6, 2], winner: false, side: "away" };

describe("parseTennis", () => {
  it("reads a match as two players with a set line each", () => {
    const event = parseTennis(
      board([
        {
          id: "1",
          name: "Men's Singles",
          competitions: [competition("m1", "post", [HERBERT, MIYOSHI])],
        },
      ]),
    );
    const match = event?.draws[0]?.matches[0];

    expect(match?.home.name).toBe("P. Herbert");
    expect(match?.home.sets.map((set) => set.games)).toEqual(["6", "4", "6"]);
    expect(match?.away.sets.map((set) => set.games)).toEqual(["2", "6", "2"]);
    expect(match?.home.winner).toBe(true);
  });

  it("keeps each draw separate, so singles and doubles do not merge", () => {
    const event = parseTennis(
      board([
        {
          id: "1",
          name: "Men's Singles",
          competitions: [competition("m1", "post", [HERBERT, MIYOSHI])],
        },
        {
          id: "2",
          name: "Men's Doubles",
          competitions: [competition("m2", "post", [HERBERT, MIYOSHI])],
        },
      ]),
    );

    expect(event?.draws.map((draw) => draw.label)).toEqual(["Men's Singles", "Men's Doubles"]);
  });

  it("puts matches in play ahead of finished ones", () => {
    const event = parseTennis(
      board([
        {
          id: "1",
          name: "Men's Singles",
          competitions: [
            competition("done", "post", [HERBERT, MIYOSHI]),
            competition("live", "in", [HERBERT, MIYOSHI]),
          ],
        },
      ]),
    );

    expect(event?.draws[0]?.matches.map((match) => match.id)).toEqual(["live", "done"]);
  });

  it("carries the round through, since a draw is read by round", () => {
    const event = parseTennis(
      board([
        {
          id: "1",
          name: "Men's Singles",
          competitions: [competition("m1", "post", [HERBERT, MIYOSHI], "Quarterfinal")],
        },
      ]),
    );

    expect(event?.draws[0]?.matches[0]?.round).toBe("Quarterfinal");
  });

  it("drops a competition that is not two players", () => {
    const event = parseTennis(
      board([
        { id: "1", name: "Men's Singles", competitions: [competition("m1", "post", [HERBERT])] },
      ]),
    );

    expect(event).toBeNull();
  });

  it("reports no tournament when the tour is between events", () => {
    expect(parseTennis({ events: [] })).toBeNull();
  });

  it("refuses a payload it cannot understand", () => {
    expect(() => parseTennis({ events: [{ name: "x" }] })).toThrow();
  });

  it("shows the tournament in play rather than whichever ESPN lists first", () => {
    const singles = [competition("m1", "post", [HERBERT, MIYOSHI])];
    const payload = {
      events: [
        {
          name: "Finished Open",
          shortName: "Finished",
          date: "2026-08-10T00:00Z",
          status: { type: { state: "post", detail: "Final" } },
          groupings: [
            { grouping: { id: "1", displayName: "Men's Singles" }, competitions: singles },
          ],
        },
        {
          name: "US Open",
          shortName: "US Open",
          date: "2026-08-24T00:00Z",
          status: { type: { state: "in", detail: "In Progress" } },
          groupings: [
            { grouping: { id: "1", displayName: "Men's Singles" }, competitions: singles },
          ],
        },
      ],
    };

    expect(parseTennis(payload)?.name).toBe("US Open");
  });

  it("skips a tournament whose draw has not been published yet", () => {
    const payload = {
      events: [
        {
          name: "Not drawn yet",
          shortName: "Not drawn",
          date: "2026-08-24T00:00Z",
          status: { type: { state: "in", detail: "In Progress" } },
          groupings: [],
        },
        {
          name: "Winston-Salem",
          shortName: "Winston-Salem",
          date: "2026-08-20T00:00Z",
          status: { type: { state: "post", detail: "Final" } },
          groupings: [
            {
              grouping: { id: "1", displayName: "Men's Singles" },
              competitions: [competition("m1", "post", [HERBERT, MIYOSHI])],
            },
          ],
        },
      ],
    };

    expect(parseTennis(payload)?.name).toBe("Winston-Salem");
  });
});
