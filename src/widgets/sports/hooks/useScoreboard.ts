import { useCallback, useRef } from "react";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { fetchScoreboard, parseCachedScoreboard } from "@/widgets/sports/lib/espn";
import type { League } from "@/widgets/sports/lib/leagues";
import { useLivePollInterval } from "@/widgets/sports/hooks/useLivePollInterval";
import { scoreboardKey } from "@/widgets/sports/lib/cacheKeys";
import { datesParam, livePollFloorMs, type DayWindow } from "@/widgets/sports/lib/window";
import type { Match } from "@/widgets/sports/types";

export function useLeagueScoreboard(league: League, dayWindow: DayWindow) {
  const lastData = useRef<Match[] | null>(null);
  const cacheKey = scoreboardKey(league, dayWindow);
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

  const intervalMs = useLivePollInterval(anyLive, livePollFloorMs(league.sport, dayWindow));

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
