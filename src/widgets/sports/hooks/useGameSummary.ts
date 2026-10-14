import { usePolledDefinition } from "@/widgets/core/usePolledResource";
import { fetchGameSummary, parseCachedGameSummary } from "@/widgets/sports/lib/summary";
import type { League } from "@/widgets/sports/lib/leagues";
import type { Match } from "@/widgets/sports/types";
import { useEffect, useRef } from "react";

export function gameSummaryKey(league: League, match: Match): string {
  return `sports:v1:summary:${league.id}:${match.id}:${match.state === "pre" ? "season" : "game"}`;
}

export function useGameSummary(league: League, match: Match) {
  const previous = useRef({ id: match.id, state: match.state });
  const resource = usePolledDefinition(
    {
      widget: "sports",
      cacheKey: gameSummaryKey(league, match),
      persist: false,
      intervalMs: match.state === "in" ? 60_000 : 15 * 60_000,
      parse: parseCachedGameSummary,
      fetch: (signal) =>
        fetchGameSummary(league.path, match.id, match.away.id, match.home.id, signal),
    },
    { enabled: league.id === "nba" || league.id === "nfl", isEmpty: () => false },
  );
  const refresh = resource.refresh;
  useEffect(() => {
    if (
      previous.current.id === match.id &&
      previous.current.state === "in" &&
      match.state === "post"
    )
      refresh();
    previous.current = { id: match.id, state: match.state };
  }, [match.id, match.state, refresh]);
  return resource;
}
