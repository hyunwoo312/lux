import { useCallback } from "react";
import { peekPolledResource, usePolledResource } from "@/widgets/core/usePolledResource";
import { sparkKey } from "@/widgets/stocks/lib/cacheKeys";
import { fetchSparks, parseCachedSparks } from "@/widgets/stocks/lib/spark";
import { useStocks } from "@/widgets/stocks/useStocksStore";
import { useStocksSync } from "@/widgets/stocks/hooks/useStocksSync";
import { DAY_RANGE, type SparkSeries, type StockRange } from "@/widgets/stocks/types";

export type SparkMap = Record<string, SparkSeries>;

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
  const cacheKey = sparkKey(symbols, range);
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchSparks(symbols, range, signal),
    [symbols, range],
  );

  const resource = usePolledResource(fetcher, {
    enabled: symbols.length > 0,
    intervalMs: isTicking(peekPolledResource<SparkMap>(cacheKey), Date.now())
      ? TICKING_INTERVAL_MS
      : IDLE_INTERVAL_MS,
    cacheKey,
    persist: true,
    parsePersisted: parseCachedSparks,
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
