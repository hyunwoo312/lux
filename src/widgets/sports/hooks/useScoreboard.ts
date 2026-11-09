import { useRef } from "react";
import { usePolledDefinition } from "@/widgets/core/usePolledResource";
import type { League } from "@/widgets/sports/lib/leagues";
import { useLivePollInterval } from "@/widgets/sports/hooks/useLivePollInterval";
import { sportsScoreboard } from "@/widgets/sports/lib/resources";
import { livePollFloorMs, untilNextStartMs, type DayWindow } from "@/widgets/sports/lib/window";
import type { Match } from "@/widgets/sports/types";
import { useSportsDate } from "@/widgets/sports/hooks/useSportsDate";
import { refreshScoreboardDays } from "@/widgets/sports/lib/scoreboardDays";
import { datesParam } from "@/widgets/sports/lib/window";

const START_GRACE_MS = 30_000;

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
  const floorMs = livePollFloorMs(league.sport, dayWindow);
  const pollMs = useLivePollInterval(anyLive, floorMs);
  const nextStartMs = lastData.current ? untilNextStartMs(lastData.current, Date.now()) : null;
  const intervalMs =
    anyLive || nextStartMs === null
      ? pollMs
      : Math.min(pollMs, Math.max(floorMs, nextStartMs + START_GRACE_MS));

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
