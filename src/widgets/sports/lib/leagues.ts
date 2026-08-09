export type League = {
  id: string;
  label: string;
  path: string;
  liveUnverified?: true;
};

export const LEAGUES: League[] = [
  { id: "nfl", label: "NFL", path: "football/nfl" },
  { id: "nba", label: "NBA", path: "basketball/nba", liveUnverified: true },
  { id: "wnba", label: "WNBA", path: "basketball/wnba" },
  { id: "mlb", label: "MLB", path: "baseball/mlb" },
  { id: "nhl", label: "NHL", path: "hockey/nhl", liveUnverified: true },
];

export const DEFAULT_LEAGUE_ID = "mlb";

export function leagueById(id: string): League | undefined {
  return LEAGUES.find((league) => league.id === id);
}
