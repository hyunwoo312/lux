import type { Match, MatchTeam } from "@/widgets/sports/types";

export function team(overrides: Partial<MatchTeam> = {}): MatchTeam {
  return {
    abbreviation: "NYM",
    name: "Mets",
    score: 6,
    winner: false,
    periods: [],
    leaders: [],
    ...overrides,
  };
}

export function match(overrides: Partial<Match> = {}): Match {
  return {
    id: "1",
    state: "in",
    detail: "End 7th",
    startsAt: "2026-08-07T22:40Z",
    away: team(),
    home: team({ abbreviation: "PIT", name: "Pirates", score: 2 }),
    ...overrides,
  };
}
