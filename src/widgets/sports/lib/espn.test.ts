import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchScoreboard,
  mirrorUrl,
  parseCachedScoreboard,
  parseMirrorScoreboard,
  parseScoreboard,
  parseTeams,
} from "@/widgets/sports/lib/espn";

function event(
  id: string,
  state: string,
  shortDetail: string,
  away: [string, string],
  home: [string, string],
  date = "2026-08-07T22:40Z",
) {
  return {
    id,
    date,
    status: { type: { state, shortDetail } },
    competitions: [
      {
        competitors: [
          {
            homeAway: "home",
            score: home[1],
            team: { abbreviation: home[0], shortDisplayName: home[0], logo: "h.png" },
          },
          {
            homeAway: "away",
            score: away[1],
            team: { abbreviation: away[0], shortDisplayName: away[0], logo: "a.png" },
          },
        ],
      },
    ],
  };
}

function leaderGroup(abbreviation: string, athlete: string, displayValue: string) {
  return { abbreviation, leaders: [{ displayValue, athlete: { shortName: athlete } }] };
}

function enrich(competitor: object, overrides: object = {}) {
  Object.assign(competitor, {
    hits: 10,
    errors: 1,
    linescores: [{ displayValue: "2" }, { displayValue: "0" }, { displayValue: "3" }],
    leaders: [
      {
        abbreviation: "AVG",
        shortDisplayName: "BA",
        leaders: [{ displayValue: "3-4, 2 2B", athlete: { shortName: "N. Sogard" } }],
      },
      {
        abbreviation: "HR",
        shortDisplayName: "HR",
        leaders: [{ displayValue: "1-5, 3 K", athlete: { shortName: "W. Contreras" } }],
      },
      {
        abbreviation: "RBI",
        shortDisplayName: "RBI",
        leaders: [{ displayValue: "1-3, 2 RBI", athlete: { shortName: "A. Monasterio" } }],
      },
    ],
    ...overrides,
  });
}

describe("box score fields", () => {
  it("reads the line score, hits and errors the scoreboard already carries", () => {
    const raw = event("1", "in", "End 7th", ["NYM", "6"], ["PIT", "2"]);
    enrich(raw.competitions[0]!.competitors[0]!);

    const [match] = parseScoreboard({ events: [raw] });

    expect(match?.home.periods).toEqual(["2", "0", "3"]);
    expect(match?.home.hits).toBe(10);
    expect(match?.home.errors).toBe(1);
  });

  it("keeps three distinct performers, so the pitching line survives the cap", () => {
    const raw = event("1", "in", "End 7th", ["NYM", "6"], ["PIT", "2"]);
    enrich(raw.competitions[0]!.competitors[0]!, {
      leaders: [
        leaderGroup("AVG", "N. Sogard", "3-4, 2 2B"),
        leaderGroup("HR", "W. Contreras", "1-5, 3 K"),
        leaderGroup("RAT", "S. Lugo", "6.0 IP, 1 ER, 7 K"),
        leaderGroup("MLB", "A. Monasterio", "1-3, 2 RBI"),
      ],
    });

    const [match] = parseScoreboard({ events: [raw] });

    expect(match?.home.leaders).toEqual([
      { label: undefined, athlete: "N. Sogard", detail: "3-4, 2 2B" },
      { label: undefined, athlete: "W. Contreras", detail: "1-5, 3 K" },
      { label: undefined, athlete: "S. Lugo", detail: "6.0 IP, 1 ER, 7 K" },
    ]);
  });

  it("credits one athlete once, so a player leading three categories does not fill every row", () => {
    const raw = event("1", "in", "End 7th", ["NYM", "6"], ["PIT", "2"]);
    Object.assign(raw.competitions[0]!.competitors[0]!, {
      leaders: [
        leaderGroup("AVG", "J. Fermin", "1-2, BB, K"),
        leaderGroup("HR", "J. Fermin", "1-2, BB, K"),
        leaderGroup("RBI", "J. Fermin", "1-2, BB, K"),
        leaderGroup("RAT", "M. Liberatore", "5.1 IP, 2 ER, 6 K"),
      ],
    });

    expect(parseScoreboard({ events: [raw] })[0]?.home.leaders).toEqual([
      { label: undefined, athlete: "J. Fermin", detail: "1-2, BB, K" },
      { label: undefined, athlete: "M. Liberatore", detail: "5.1 IP, 2 ER, 6 K" },
    ]);
  });

  it("keeps the category label when the value is a bare stat that means nothing on its own", () => {
    const raw = event("1", "in", "Q3 4:12", ["MIA", "58"], ["TOR", "61"]);
    Object.assign(raw.competitions[0]!.competitors[0]!, {
      leaders: [leaderGroup("PTS", "K. Mitchell", "24.3"), leaderGroup("REB", "A. Boston", "8.4")],
    });

    expect(parseScoreboard({ events: [raw] })[0]?.home.leaders).toEqual([
      { label: "PTS", athlete: "K. Mitchell", detail: "24.3" },
      { label: "REB", athlete: "A. Boston", detail: "8.4" },
    ]);
  });

  it("drops a leader entry that has no athlete rather than rendering a blank name", () => {
    const raw = event("1", "in", "End 7th", ["NYM", "6"], ["PIT", "2"]);
    Object.assign(raw.competitions[0]!.competitors[0]!, {
      leaders: [{ abbreviation: "AVG", leaders: [{ displayValue: "3-4" }] }],
    });

    expect(parseScoreboard({ events: [raw] })[0]?.home.leaders).toEqual([]);
  });

  it("offers the probable starter before a game and no box score yet", () => {
    const raw = event("1", "pre", "7:30 PM", ["NYM", "0"], ["PIT", "0"]);
    enrich(raw.competitions[0]!.competitors[0]!, {
      probables: [{ athlete: { shortName: "S. Lugo" } }],
    });

    const [match] = parseScoreboard({ events: [raw] });

    expect(match?.home.probable).toBe("S. Lugo");
    expect(match?.home.periods).toEqual([]);
    expect(match?.home.leaders).toEqual([]);
  });

  it("leaves hits and errors absent for a sport that does not report them", () => {
    const raw = event("1", "post", "Final", ["KC", "17"], ["DEN", "20"]);
    Object.assign(raw.competitions[0]!.competitors[0]!, {
      linescores: [{ displayValue: "7" }, { displayValue: "3" }, { displayValue: "10" }],
    });

    const [match] = parseScoreboard({ events: [raw] });

    expect(match?.home.periods).toHaveLength(3);
    expect(match?.home.hits).toBeUndefined();
    expect(match?.home.errors).toBeUndefined();
  });
});

describe("parseScoreboard", () => {
  it("reads a live game the way ESPN actually returns it", () => {
    const [match] = parseScoreboard({
      events: [event("1", "in", "End 7th", ["NYM", "6"], ["PIT", "2"])],
    });

    expect(match).toMatchObject({
      state: "in",
      detail: "End 7th",
      away: { abbreviation: "NYM", score: 6 },
      home: { abbreviation: "PIT", score: 2 },
    });
  });

  it("does not invent a 0-0 scoreline for a game that has not started", () => {
    const [match] = parseScoreboard({
      events: [event("1", "pre", "8/7 - 9:40 PM EDT", ["SD", "0"], ["HOU", "0"])],
    });

    expect(match?.away.score).toBeNull();
    expect(match?.home.score).toBeNull();
  });

  it("puts live games first, then upcoming, then finished", () => {
    const matches = parseScoreboard({
      events: [
        event("done", "post", "FT", ["AME", "3"], ["SAN", "0"]),
        event("soon", "pre", "9:40 PM", ["SD", "0"], ["HOU", "0"]),
        event("live", "in", "End 7th", ["NYM", "6"], ["PIT", "2"]),
      ],
    });

    expect(matches.map((match) => match.id)).toEqual(["live", "soon", "done"]);
  });

  it("orders same-state games by start time", () => {
    const matches = parseScoreboard({
      events: [
        event("late", "pre", "10 PM", ["A", "0"], ["B", "0"], "2026-08-07T23:00Z"),
        event("early", "pre", "7 PM", ["C", "0"], ["D", "0"], "2026-08-07T19:00Z"),
      ],
    });

    expect(matches.map((match) => match.id)).toEqual(["early", "late"]);
  });

  it("keeps the rest of the slate when one fixture is malformed", () => {
    const matches = parseScoreboard({
      events: [
        { id: "broken", date: "2026-08-07T22:40Z" },
        event("ok", "in", "End 7th", ["NYM", "6"], ["PIT", "2"]),
      ],
    });

    expect(matches.map((match) => match.id)).toEqual(["ok"]);
  });

  it("drops a fixture that is missing one side rather than rendering half a row", () => {
    const broken = {
      id: "half",
      date: "2026-08-07T22:40Z",
      status: { type: { state: "in", shortDetail: "1st" } },
      competitions: [
        { competitors: [{ homeAway: "home", score: "1", team: { abbreviation: "A" } }] },
      ],
    };

    expect(parseScoreboard({ events: [broken] })).toEqual([]);
  });

  it("keeps the detail fields the row can expand into", () => {
    const raw = event("1", "in", "End 7th", ["ATL", "6"], ["NYY", "2"]);
    Object.assign(raw, { links: [{ href: "https://espn.com/game/1" }] });
    Object.assign(raw.competitions[0]!, {
      venue: { fullName: "Yankee Stadium" },
      broadcasts: [{ names: ["MLB.TV"] }],
      situation: { balls: 0, strikes: 2, outs: 2, onSecond: true, lastPlay: { text: "Strike 2" } },
    });
    Object.assign(raw.competitions[0]!.competitors[0]!, { records: [{ summary: "65-51" }] });
    Object.assign(raw.competitions[0]!.competitors[1]!, { records: [{ summary: "70-46" }] });

    const [match] = parseScoreboard({ events: [raw] });

    expect(match?.link).toBe("https://espn.com/game/1");
    expect(match?.venue).toBe("Yankee Stadium");
    expect(match?.broadcast).toBe("MLB.TV");
    expect(match?.home.record).toBe("65-51");
    expect(match?.situation).toMatchObject({ balls: 0, strikes: 2, outs: 2, bases: [2] });
    expect(match?.situation?.lastPlay).toBe("Strike 2");
  });

  it("ignores the live situation for a game that is not in progress", () => {
    const raw = event("1", "post", "Final", ["ATL", "6"], ["NYY", "2"]);
    Object.assign(raw.competitions[0]!, { situation: { outs: 2, onFirst: true } });

    expect(parseScoreboard({ events: [raw] })[0]?.situation).toBeUndefined();
  });

  it("treats an empty slate as empty, not broken", () => {
    expect(parseScoreboard({ events: [] })).toEqual([]);
    expect(parseScoreboard({})).toEqual([]);
  });

  it("rejects a response that is not a scoreboard at all", () => {
    expect(() => parseScoreboard("nope")).toThrow();
  });
});

describe("parseCachedScoreboard", () => {
  it("round-trips every field parseScoreboard produces, not just the basic ones", () => {
    const raw = event("1", "in", "End 7th", ["NYM", "6"], ["PIT", "2"]);
    Object.assign(raw, { links: [{ href: "https://espn.com/game/1" }] });
    Object.assign(raw.competitions[0]!, {
      venue: { fullName: "Yankee Stadium" },
      broadcasts: [{ names: ["MLB.TV"] }],
      situation: { balls: 1, strikes: 2, outs: 2, onSecond: true, lastPlay: { text: "Foul" } },
    });
    Object.assign(raw.competitions[0]!.competitors[0]!, { records: [{ summary: "65-51" }] });
    Object.assign(raw.competitions[0]!.competitors[1]!, { records: [{ summary: "70-46" }] });
    enrich(raw.competitions[0]!.competitors[0]!);
    enrich(raw.competitions[0]!.competitors[1]!);
    const matches = parseScoreboard({ events: [raw] });

    expect(parseCachedScoreboard(JSON.parse(JSON.stringify(matches)))).toEqual(matches);
  });

  it("rejects a malformed cache", () => {
    expect(parseCachedScoreboard([{ id: "1" }])).toBeNull();
  });
});

describe("parseTeams", () => {
  const payload = (teams: unknown[]) => ({ sports: [{ leagues: [{ teams }] }] });

  it("reads the roster ESPN returns and sorts it for the picker", () => {
    const teams = parseTeams(
      payload([
        { team: { abbreviation: "NYY", shortDisplayName: "Yankees" } },
        { team: { abbreviation: "ATL", shortDisplayName: "Braves" } },
      ]),
    );

    expect(teams).toEqual([
      { abbreviation: "ATL", name: "Braves" },
      { abbreviation: "NYY", name: "Yankees" },
    ]);
  });

  it("falls back to the long name when there is no short one", () => {
    const teams = parseTeams(payload([{ team: { abbreviation: "SD", displayName: "San Diego" } }]));

    expect(teams[0]?.name).toBe("San Diego");
  });

  it("drops a team with no abbreviation rather than offering a blank option", () => {
    const teams = parseTeams(payload([{ team: { shortDisplayName: "Mystery" } }]));

    expect(teams).toEqual([]);
  });

  it("rejects a response that is not a teams payload", () => {
    expect(() => parseTeams({ nope: true })).toThrow();
  });

  it("picks up the team badge for the picker, and leaves it absent when there is none", () => {
    const badged = parseTeams(
      payload([
        {
          team: {
            abbreviation: "ARI",
            shortDisplayName: "D-backs",
            logos: [{ href: "https://a.espncdn.com/ari.png" }],
          },
        },
      ]),
    );
    const bare = parseTeams(payload([{ team: { abbreviation: "ARI" } }]));

    expect(badged[0]?.logo).toBe("https://a.espncdn.com/ari.png");
    expect(bare[0]?.logo).toBeUndefined();
  });
});

describe("mirrorUrl", () => {
  it("maps a team-sport path to the mirror's league slug", () => {
    expect(mirrorUrl("baseball/mlb")).toBe("https://cdn.espn.com/core/mlb/scoreboard?xhr=1");
    expect(mirrorUrl("football/nfl")).toBe("https://cdn.espn.com/core/nfl/scoreboard?xhr=1");
  });

  it("has no mirror for a path it cannot split", () => {
    expect(mirrorUrl("mlb")).toBeNull();
  });
});

describe("parseMirrorScoreboard", () => {
  it("reads events out of the mirror's nested envelope", () => {
    const raw = {
      content: { sbData: { events: [event("1", "in", "Bot 5th", ["A", "2"], ["B", "3"])] } },
    };

    expect(parseMirrorScoreboard(raw)).toHaveLength(1);
  });

  it("throws on the error body the mirror serves with a 200 for unsupported leagues", () => {
    expect(() => parseMirrorScoreboard({ error: "Not Found", status: 404, content: {} })).toThrow();
  });
});

describe("fetchScoreboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function respond(body: unknown, ok = true) {
    return new Response(JSON.stringify(body), { status: ok ? 200 : 500 });
  }

  const primary = { events: [event("1", "pre", "7:30 PM", ["A", ""], ["B", ""])] };
  const mirror = {
    content: { sbData: { events: [event("2", "in", "Bot 5th", ["C", "1"], ["D", "4"])] } },
  };

  it("uses the primary host when it answers", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(respond(primary));

    const matches = await fetchScoreboard("baseball/mlb");

    expect(matches[0]?.id).toBe("1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the mirror when the primary host fails", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(respond(null, false))
      .mockResolvedValueOnce(respond(mirror));

    const matches = await fetchScoreboard("baseball/mlb");

    expect(matches[0]?.id).toBe("2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports the original failure when the mirror is unusable too", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(respond(null, false))
      .mockResolvedValueOnce(respond({ error: "Not Found", content: {} }));

    await expect(fetchScoreboard("baseball/mlb")).rejects.toThrow("Scores are unavailable");
  });

  it("does not retry a request the caller aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(respond(null, false));

    await expect(fetchScoreboard("baseball/mlb", controller.signal)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not attempt a mirror for a league the mirror does not serve", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(respond(null, false));

    await expect(fetchScoreboard("mlb")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("asks for a whole date range instead of the first page of it", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(respond(primary));

    await fetchScoreboard("baseball/mlb", undefined, "20260820-20260903");

    expect(fetchMock.mock.calls[0]?.[0]).toContain("dates=20260820-20260903&limit=");
  });

  it("fails rather than letting the mirror answer a range with today only", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(respond(null, false));

    await expect(fetchScoreboard("baseball/mlb", undefined, "20260820-20260903")).rejects.toThrow(
      "Scores are unavailable",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
