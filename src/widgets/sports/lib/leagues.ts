import {
  BaseballIcon,
  BasketballIcon,
  FootballIcon,
  GolfIcon,
  HockeyIcon,
  SoccerIcon,
  TennisIcon,
} from "@/widgets/sports/components/sportIcons";
import type { WidgetIcon } from "@/widgets/core/types";

export const SPORTS = [
  "soccer",
  "football",
  "basketball",
  "baseball",
  "hockey",
  "tennis",
  "golf",
] as const;
export type Sport = (typeof SPORTS)[number];

export const SPORT_LABEL: Record<Sport, string> = {
  soccer: "Soccer",
  football: "Football",
  basketball: "Basketball",
  baseball: "Baseball",
  hockey: "Hockey",
  tennis: "Tennis",
  golf: "Golf",
};

export const SPORT_ICON: Record<Sport, WidgetIcon> = {
  soccer: SoccerIcon,
  football: FootballIcon,
  basketball: BasketballIcon,
  baseball: BaseballIcon,
  hockey: HockeyIcon,
  tennis: TennisIcon,
  golf: GolfIcon,
};

type LeagueBase = {
  id: string;
  label: string;
  sport: Sport;
  path: string;
  liveUnverified?: true;
};

export type LeagueKind = "match" | "leaderboard" | "draw";
export type League = LeagueBase & { kind: LeagueKind };

const MLB: League = {
  kind: "match",
  id: "mlb",
  label: "MLB",
  sport: "baseball",
  path: "baseball/mlb",
};

export const LEAGUES: League[] = [
  { kind: "match", id: "nfl", label: "NFL", sport: "football", path: "football/nfl" },
  {
    kind: "match",
    id: "nba",
    label: "NBA",
    sport: "basketball",
    path: "basketball/nba",
    liveUnverified: true,
  },
  { kind: "match", id: "wnba", label: "WNBA", sport: "basketball", path: "basketball/wnba" },
  MLB,
  {
    kind: "match",
    id: "collegebaseball",
    label: "NCAA Baseball",
    sport: "baseball",
    path: "baseball/college-baseball",
    liveUnverified: true,
  },
  {
    kind: "match",
    id: "collegesoftball",
    label: "NCAA Softball",
    sport: "baseball",
    path: "baseball/college-softball",
    liveUnverified: true,
  },
  {
    kind: "match",
    id: "wbc",
    label: "WBC",
    sport: "baseball",
    path: "baseball/world-baseball-classic",
    liveUnverified: true,
  },
  {
    kind: "match",
    id: "nhl",
    label: "NHL",
    sport: "hockey",
    path: "hockey/nhl",
    liveUnverified: true,
  },
  { kind: "match", id: "epl", label: "Premier League", sport: "soccer", path: "soccer/eng.1" },
  {
    kind: "match",
    id: "ucl",
    label: "Champions League",
    sport: "soccer",
    path: "soccer/uefa.champions",
  },
  { kind: "match", id: "laliga", label: "La Liga", sport: "soccer", path: "soccer/esp.1" },
  { kind: "match", id: "bundesliga", label: "Bundesliga", sport: "soccer", path: "soccer/ger.1" },
  { kind: "match", id: "seriea", label: "Serie A", sport: "soccer", path: "soccer/ita.1" },
  { kind: "match", id: "ligue1", label: "Ligue 1", sport: "soccer", path: "soccer/fra.1" },
  { kind: "match", id: "mls", label: "MLS", sport: "soccer", path: "soccer/usa.1" },
  {
    kind: "leaderboard",
    id: "pga",
    label: "PGA Tour",
    sport: "golf",
    path: "golf/pga",
  },
  {
    kind: "leaderboard",
    id: "lpga",
    label: "LPGA Tour",
    sport: "golf",
    path: "golf/lpga",
  },
  {
    kind: "leaderboard",
    id: "dpworld",
    label: "DP World Tour",
    sport: "golf",
    path: "golf/eur",
  },
  {
    kind: "leaderboard",
    id: "liv",
    label: "LIV Golf",
    sport: "golf",
    path: "golf/liv",
  },
  {
    kind: "leaderboard",
    id: "champions",
    label: "PGA Tour Champions",
    sport: "golf",
    path: "golf/champions-tour",
  },
  { kind: "draw", id: "atp", label: "ATP Tour", sport: "tennis", path: "tennis/atp" },
  { kind: "draw", id: "wta", label: "WTA Tour", sport: "tennis", path: "tennis/wta" },
];

export const DEFAULT_LEAGUE = MLB;
export const DEFAULT_LEAGUE_ID = MLB.id;

export function leagueById(id: string): League | undefined {
  return LEAGUES.find((league) => league.id === id);
}

export function leaguesBySport(sport: Sport): League[] {
  return LEAGUES.filter((league) => league.sport === sport);
}

export function activeSports(): Sport[] {
  return SPORTS.filter((sport) => leaguesBySport(sport).length > 0);
}
