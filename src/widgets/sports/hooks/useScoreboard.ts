import { useCallback, useRef } from "react";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { fetchScoreboard, parseCachedScoreboard } from "@/widgets/sports/lib/espn";
import { DEFAULT_LEAGUE_ID, leagueById, type League } from "@/widgets/sports/lib/leagues";
import { useSports } from "@/widgets/sports/useSportsStore";
import { useLivePollInterval } from "@/widgets/sports/hooks/useLivePollInterval";
import { datesParam, LIVE_FLOOR_MS } from "@/widgets/sports/lib/window";
import type { Match } from "@/widgets/sports/types";

export function useScoreboard() {
  const leagueId = useSports((d) => d.leagueId);
  const dayWindow = useSports((d) => d.window);
  const league = (leagueById(leagueId) ?? leagueById(DEFAULT_LEAGUE_ID)) as League;
  const lastData = useRef<Match[] | null>(null);
  const cacheKey = `sports:${league.id}:${dayWindow}`;
  const cacheKeyRef = useRef(cacheKey);
  if (cacheKeyRef.current !== cacheKey) {
    cacheKeyRef.current = cacheKey;
    lastData.current = null;
  }

  const anyLive = lastData.current?.some((match) => match.state === "in") ?? false;
  const dates = datesParam(dayWindow, new Date());

  const fetcher = useCallback(
    (signal: AbortSignal) => fetchScoreboard(league.path, signal, dates),
    [league.path, dates],
  );

  const intervalMs = useLivePollInterval(anyLive, LIVE_FLOOR_MS[dayWindow]);

  const resource = usePolledResource(fetcher, {
    intervalMs,
    cacheKey,
    persist: true,
    parsePersisted: parseCachedScoreboard,
    isEmpty: (matches) => matches.length === 0,
  });

  lastData.current = resource.state.status === "success" ? resource.state.data : null;

  return { ...resource, league };
}
