import { DEFAULT_LEAGUE_ID, leagueById, type League } from "@/widgets/sports/lib/leagues";
import { useSports } from "@/widgets/sports/useSportsStore";

export function useCurrentLeague(): League {
  const leagueId = useSports((d) => d.leagueId);
  return (leagueById(leagueId) ?? leagueById(DEFAULT_LEAGUE_ID)) as League;
}
