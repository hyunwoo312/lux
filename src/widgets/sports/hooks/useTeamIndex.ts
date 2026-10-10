import { usePolledDefinition } from "@/widgets/core/usePolledResource";
import { sportsTeamIndex } from "@/widgets/sports/lib/resources";

export function useTeamIndex(enabled: boolean) {
  return usePolledDefinition(sportsTeamIndex, {
    enabled,
    isEmpty: (index) => index.teams.length === 0 && index.missing.length === 0,
  });
}
