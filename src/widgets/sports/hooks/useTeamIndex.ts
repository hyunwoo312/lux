import { useCallback } from "react";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { TEAM_INDEX_KEY } from "@/widgets/sports/lib/cacheKeys";
import { fetchTeamIndex, parseCachedTeamIndex } from "@/widgets/sports/lib/teamIndex";

const INDEX_REFRESH_MS = 24 * 60 * 60 * 1000;

export function useTeamIndex(enabled: boolean) {
  const fetcher = useCallback((signal: AbortSignal) => fetchTeamIndex(signal), []);

  return usePolledResource(fetcher, {
    enabled,
    intervalMs: INDEX_REFRESH_MS,
    cacheKey: TEAM_INDEX_KEY,
    persist: true,
    parsePersisted: parseCachedTeamIndex,
    isEmpty: (teams) => teams.length === 0,
  });
}
