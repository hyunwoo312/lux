import type { PolledDefinition } from "@/widgets/core/usePolledResource";
import { sparkKey, TRENDING_KEY } from "@/widgets/stocks/lib/cacheKeys";
import { fetchSparks, parseCachedSparks } from "@/widgets/stocks/lib/spark";
import { fetchTrendingSymbols, parseCachedTrending } from "@/widgets/stocks/lib/symbols";
import type { SparkSeries, StockRange } from "@/widgets/stocks/types";

export type SparkMap = Record<string, SparkSeries>;

const SPARK_INTERVAL_MS = 60_000;
const TRENDING_INTERVAL_MS = 60 * 60_000;

export function stocksSparks(symbols: string[], range: StockRange): PolledDefinition<SparkMap> {
  return {
    cacheKey: sparkKey(symbols, range),
    intervalMs: SPARK_INTERVAL_MS,
    parse: parseCachedSparks,
    fetch: (signal) => fetchSparks(symbols, range, signal),
  };
}

export const stocksTrending: PolledDefinition<string[]> = {
  cacheKey: TRENDING_KEY,
  intervalMs: TRENDING_INTERVAL_MS,
  parse: parseCachedTrending,
  fetch: fetchTrendingSymbols,
};
