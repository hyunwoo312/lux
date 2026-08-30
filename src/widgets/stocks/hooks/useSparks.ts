import { peekPolledResource, usePolledDefinition } from "@/widgets/core/usePolledResource";
import { stocksSparks, type SparkMap } from "@/widgets/stocks/lib/resources";
import { useStocks } from "@/widgets/stocks/useStocksStore";
import { useStocksSync } from "@/widgets/stocks/hooks/useStocksSync";
import { DAY_RANGE, type StockRange } from "@/widgets/stocks/types";

export type { SparkMap };

const TICKING_INTERVAL_MS = 60_000;
const IDLE_INTERVAL_MS = 10 * 60_000;
const TICKING_WINDOW_MS = 15 * 60_000;

function isTicking(map: SparkMap | undefined, nowMs: number): boolean {
  if (!map) return true;
  return Object.values(map).some((series) => {
    const last = series.points.at(-1)?.time;
    return last != null && nowMs - last * 1000 < TICKING_WINDOW_MS;
  });
}

function useSparkResource(symbols: string[], range: StockRange) {
  const definition = stocksSparks(symbols, range);

  const resource = usePolledDefinition(definition, {
    enabled: symbols.length > 0,
    intervalMs: isTicking(peekPolledResource<SparkMap>(definition.cacheKey), Date.now())
      ? TICKING_INTERVAL_MS
      : IDLE_INTERVAL_MS,
  });

  return {
    ...resource,
    map: resource.state.status === "success" ? resource.state.data : null,
  };
}

export function useWatchlistSparks() {
  const symbols = useStocks((d) => d.symbols);
  const resource = useSparkResource(symbols, DAY_RANGE);
  useStocksSync(resource.refresh, resource.isRefreshing, resource.lastSyncedAt);
  return resource;
}

export function useIndexSparks() {
  const indexSymbols = useStocks((d) => d.indexSymbols);
  return useSparkResource(indexSymbols, DAY_RANGE);
}
