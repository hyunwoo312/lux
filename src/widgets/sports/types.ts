import type { AccentPreset } from "@/widgets/core/accent";

export const SPORTS_ACCENT: AccentPreset = "violet";

export const MATCH_STATES = ["pre", "in", "post"] as const;
export type MatchState = (typeof MATCH_STATES)[number];

export type MatchLeader = {
  label: string;
  athlete: string;
  detail: string;
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
};
