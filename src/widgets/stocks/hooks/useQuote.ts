import { useCallback, useRef, useSyncExternalStore } from "react";
import {
  polledResourceVersion,
  usePolledResource,
  watchPolledResource,
} from "@/widgets/core/usePolledResource";
import { fetchQuote, parseCachedQuote } from "@/widgets/stocks/lib/yahoo-finance";
import { marketState } from "@/widgets/stocks/lib/quote";
import { useStocks } from "@/widgets/stocks/useStocksStore";
import type { Quote, StockRange } from "@/widgets/stocks/types";

const OPEN_INTERVAL_MS = 60_000;
const CLOSED_INTERVAL_MS = 10 * 60_000;

export function quoteCacheKey(symbol: string, range: StockRange): string {
  return `stocks:quote:${symbol}:${range}`;
}

export function useQuotesVersion(symbols: string[], range: StockRange, enabled: boolean): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!enabled) return () => undefined;
      const unsubscribes = symbols.map((symbol) =>
        watchPolledResource(quoteCacheKey(symbol, range), onChange),
      );
      return () => {
        for (const unsubscribe of unsubscribes) unsubscribe();
      };
    },
    [symbols, range, enabled],
  );
  const getVersion = useCallback(
    () =>
      symbols.reduce((sum, symbol) => sum + polledResourceVersion(quoteCacheKey(symbol, range)), 0),
    [symbols, range],
  );
  return useSyncExternalStore(subscribe, getVersion);
}

export function useQuote(symbol: string) {
  const range = useStocks((d) => d.range);
  const lastData = useRef<Quote | null>(null);

  const intervalMs =
    lastData.current && marketState(lastData.current, Date.now()) === "closed"
      ? CLOSED_INTERVAL_MS
      : OPEN_INTERVAL_MS;

  const fetcher = useCallback(
    (signal: AbortSignal) => fetchQuote(symbol, range, signal),
    [symbol, range],
  );

  const resource = usePolledResource(fetcher, {
    intervalMs,
    cacheKey: quoteCacheKey(symbol, range),
    persist: true,
    parsePersisted: parseCachedQuote,
  });

  const data = resource.state.status === "success" ? resource.state.data : null;
  lastData.current = data;

  return { ...resource, data, range };
}
