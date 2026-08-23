import { matchesTeam } from "@/widgets/sports/lib/espn";
import { leagueById, type League } from "@/widgets/sports/lib/leagues";
import type { LeagueFollowing, Match } from "@/widgets/sports/types";

export type FollowedLeague = { league: League; teams: string[] };

export function followedLeagues(following: Record<string, LeagueFollowing>): FollowedLeague[] {
  return Object.entries(following).flatMap(([leagueId, entry]) => {
    const league = leagueById(leagueId);
    if (!league) return [];
    if (entry.teams.length === 0 && entry.tour !== true) return [];
    return [{ league, teams: entry.teams }];
  });
}

type FollowedView = {
  matches: Match[];
  idle: string[];
};

export function followedView(visible: Match[], all: Match[], teams: string[]): FollowedView {
  return {
    matches: visible.filter((match) => teams.some((team) => matchesTeam(match, team))),
    idle: teams.filter((team) => !all.some((match) => matchesTeam(match, team))),
  };
}
