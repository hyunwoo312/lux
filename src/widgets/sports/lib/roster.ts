import { matchesTeam } from "@/widgets/sports/lib/espn";
import type { Match } from "@/widgets/sports/types";

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
