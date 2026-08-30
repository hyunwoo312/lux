import { useRef } from "react";
import { usePolledDefinition } from "@/widgets/core/usePolledResource";
import type { League } from "@/widgets/sports/lib/leagues";
import { useLivePollInterval } from "@/widgets/sports/hooks/useLivePollInterval";
import { sportsScoreboard } from "@/widgets/sports/lib/resources";
import { livePollFloorMs, type DayWindow } from "@/widgets/sports/lib/window";
import type { Match } from "@/widgets/sports/types";

export function useLeagueScoreboard(league: League, dayWindow: DayWindow) {
  const lastData = useRef<Match[] | null>(null);
  const definition = sportsScoreboard(league, dayWindow);
  const cacheKeyRef = useRef(definition.cacheKey);
  if (cacheKeyRef.current !== definition.cacheKey) {
    cacheKeyRef.current = definition.cacheKey;
    lastData.current = null;
  }

  const anyLive = lastData.current?.some((match) => match.state === "in") ?? false;
  const intervalMs = useLivePollInterval(anyLive, livePollFloorMs(league.sport, dayWindow));

  const resource = usePolledDefinition(definition, {
    intervalMs,
    isEmpty: (matches) => matches.length === 0,
  });

  lastData.current = resource.state.status === "success" ? resource.state.data : null;

  return { ...resource, league };
}
