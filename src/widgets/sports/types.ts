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
  home: MatchTeam;
  away: MatchTeam;
  link?: string;
  venue?: string;
  broadcast?: string;
  situation?: MatchSituation;
  events: MatchEvent[];
  stats: MatchStat[];
};
