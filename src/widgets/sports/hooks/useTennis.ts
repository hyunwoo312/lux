import { useCallback, useRef } from "react";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { useLivePollInterval } from "@/widgets/sports/hooks/useLivePollInterval";
import { scoreboardKey } from "@/widgets/sports/lib/cacheKeys";
import { fetchTennis, parseCachedTennis } from "@/widgets/sports/lib/tennis";
import type { League } from "@/widgets/sports/lib/leagues";
import { DEFAULT_DAY_WINDOW, livePollFloorMs } from "@/widgets/sports/lib/window";

export function useTennis(league: League) {
  const cacheKey = scoreboardKey(league, DEFAULT_DAY_WINDOW);
  const cacheKeyRef = useRef(cacheKey);
  const wasLive = useRef(false);
  if (cacheKeyRef.current !== cacheKey) {
    cacheKeyRef.current = cacheKey;
    wasLive.current = false;
  }

  const fetcher = useCallback(
    (signal: AbortSignal) => fetchTennis(league.path, signal),
    [league.path],
  );

  const intervalMs = useLivePollInterval(
    wasLive.current,
    livePollFloorMs(league.sport, DEFAULT_DAY_WINDOW),
  );

  const resource = usePolledResource(fetcher, {
    intervalMs,
    cacheKey,
    persist: true,
    parsePersisted: parseCachedTennis,
    isEmpty: (event) => event === null,
  });

  wasLive.current =
    resource.state.status === "success" &&
    (resource.state.data?.draws.some((draw) =>
      draw.matches.some((match) => match.state === "in"),
    ) ??
      false);

  return resource;
}
