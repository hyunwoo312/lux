import { useRef } from "react";
import { usePolledDefinition } from "@/widgets/core/usePolledResource";
import type { League } from "@/widgets/sports/lib/leagues";
import { useLivePollInterval } from "@/widgets/sports/hooks/useLivePollInterval";
import { sportsScoreboard } from "@/widgets/sports/lib/resources";
import { livePollFloorMs, type DayWindow } from "@/widgets/sports/lib/window";
import type { Match } from "@/widgets/sports/types";
import { useSportsDate } from "@/widgets/sports/hooks/useSportsDate";
import { refreshScoreboardDays } from "@/widgets/sports/lib/scoreboardDays";
import { datesParam } from "@/widgets/sports/lib/window";

export function useLeagueScoreboard(league: League, dayWindow: DayWindow) {
  const lastData = useRef<Match[] | null>(null);
  const date = useSportsDate();
  const definition = sportsScoreboard(league, dayWindow, date);
  const cacheKeyRef = useRef(definition.cacheKey);
  if (cacheKeyRef.current !== definition.cacheKey) {
    cacheKeyRef.current = definition.cacheKey;
    lastData.current = null;
  }

  const anyLive = lastData.current?.some((match) => match.state === "in") ?? false;
  const intervalMs = useLivePollInterval(anyLive, livePollFloorMs(league.sport, dayWindow));

  const resource = usePolledDefinition(definition, {
    intervalMs,
    isEmpty: (data) => data.matches.length === 0 && data.missingDays.length === 0,
  });

  lastData.current = resource.state.status === "success" ? resource.state.data.matches : null;

  return {
    ...resource,
    refresh: () => {
      refreshScoreboardDays(league.path, datesParam(dayWindow, date));
      resource.refresh();
    },
    state:
      resource.state.status === "success"
        ? { status: "success" as const, data: resource.state.data.matches }
        : resource.state,
    missingDays: resource.state.status === "success" ? resource.state.data.missingDays : [],
    league,
  };
}
