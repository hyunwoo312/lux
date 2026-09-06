import { useRef } from "react";
import { usePolledDefinition } from "@/widgets/core/usePolledResource";
import { useLivePollInterval } from "@/widgets/sports/hooks/useLivePollInterval";
import type { League } from "@/widgets/sports/lib/leagues";
import { sportsTennis } from "@/widgets/sports/lib/resources";
import { DEFAULT_DAY_WINDOW, livePollFloorMs } from "@/widgets/sports/lib/window";

export function useTennis(league: League) {
  const definition = sportsTennis(league);
  const cacheKeyRef = useRef(definition.cacheKey);
  const wasLive = useRef(false);
  if (cacheKeyRef.current !== definition.cacheKey) {
    cacheKeyRef.current = definition.cacheKey;
    wasLive.current = false;
  }

  const intervalMs = useLivePollInterval(
    wasLive.current,
    livePollFloorMs(league.sport, DEFAULT_DAY_WINDOW),
  );

  const resource = usePolledDefinition(definition, {
    intervalMs,
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
