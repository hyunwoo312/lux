import type { AccentPreset } from "@/widgets/core/accent";

export const SPORTS_TINT: AccentPreset = "violet";

export const SPORTS_TABS = ["discover", "favorites"] as const;
export type SportsTab = (typeof SPORTS_TABS)[number];

export type LeagueFollowing = { teams: string[]; tour?: boolean };

export const MATCH_STATES = ["pre", "in", "post"] as const;
export type MatchState = (typeof MATCH_STATES)[number];

export const STATE_ORDER: Record<MatchState, number> = { in: 0, pre: 1, post: 2 };

export type MatchLeader = {
  label?: string;
  athlete: string;
  detail: string;
};

export const MATCH_EVENT_KINDS = [
  "goal",
  "own-goal",
  "penalty",
  "penalty-missed",
  "yellow",
  "red",
] as const;
export type MatchEventKind = (typeof MATCH_EVENT_KINDS)[number];

export type MatchEvent = {
  minute: string;
  side: "home" | "away";
  kind: MatchEventKind;
  player: string;
};

export type MatchStat = {
  label: string;
  home: number;
  away: number;
  suffix?: string;
};

export type MatchTeam = {
  id?: string;
  fullName?: string;
  abbreviation: string;
  name: string;
  score: number | null;
  logo?: string;
  winner: boolean;
  record?: string;
  periods: string[];
  hits?: number;
  errors?: number;
  leaders: MatchLeader[];
  probable?: string;
  form?: string;
  shootout?: number;
};

export type MatchSituation = {
  balls?: number;
  strikes?: number;
  outs?: number;
  bases: number[];
  lastPlay?: string;
};

export type Match = {
  id: string;
  state: MatchState;
  detail: string;
  startsAt: string;
  phase?: string;
  home: MatchTeam;
  away: MatchTeam;
  link?: string;
  venue?: string;
  broadcast?: string;
  situation?: MatchSituation;
  events: MatchEvent[];
  stats: MatchStat[];
};

export type GameStat = {
  key: string;
  label: string;
  away: string;
  home: string;
  awayValue?: number;
  homeValue?: number;
};
export type GamePlayer = {
  id: string;
  name: string;
  starter: boolean;
  unavailable?: string;
  values: Record<string, string>;
};
export type GamePlayerGroup = {
  id: string;
  teamId: string;
  team: string;
  category: string;
  columns: { key: string; label: string }[];
  players: GamePlayer[];
};
export type GamePlay = {
  id: string;
  text: string;
  period: number;
  clock: string;
  awayScore?: number;
  homeScore?: number;
  scoring: boolean;
  teamId?: string;
};
export type GameDrive = {
  id: string;
  result: string;
  description: string;
  teamId?: string;
  plays: GamePlay[];
};
export type GameSummary = {
  eventId: string;
  context: "season" | "game";
  stats: GameStat[];
  players: GamePlayerGroup[];
  plays: GamePlay[];
  drives: GameDrive[];
};
