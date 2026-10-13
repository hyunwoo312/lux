import { useCallback } from "react";
import { readPolled, usePolledResource } from "@/widgets/core/usePolledResource";
import { quoteKey, sparkKey } from "@/widgets/stocks/lib/cacheKeys";
import { fetchQuote, parseCachedQuote } from "@/widgets/stocks/lib/quotes";
import { useStocks } from "@/widgets/stocks/useStocksStore";
import type { Quote } from "@/widgets/stocks/types";

const INTERVAL = 15 * 60_000;

export function useWatchlistQuotes() {
  const symbols = useStocks((data) => data.symbols);
  const identity = sparkKey(symbols, "1d");
  const fetcher = useCallback(
    async (signal: AbortSignal) => {
      const requested = [...new Set(symbols)].sort();
      const results = await Promise.allSettled(
        requested.map((symbol) =>
          readPolled<Quote>({
            widget: "stocks",
            cacheKey: quoteKey(symbol, "1d"),
            intervalMs: INTERVAL,
            parse: parseCachedQuote,
            fetch: (signal) => fetchQuote(symbol, "1d", signal),
          }),
        ),
      );
      signal.throwIfAborted();
      const quotes: Record<string, Quote> = {};
      results.forEach((result, index) => {
        if (result.status === "fulfilled") quotes[requested[index]!] = result.value;
      });
      if (results.length > 0 && Object.keys(quotes).length === 0) {
        const failure = results.find((result) => result.status === "rejected");
        throw failure?.status === "rejected"
          ? failure.reason
          : new Error("Quote metadata unavailable");
      }
      return quotes;
    },
    [symbols],
  );
  const resource = usePolledResource(fetcher, {
    enabled: symbols.length > 0,
    intervalMs: INTERVAL,
    cacheKey: `${identity}:metadata`,
    persist: false,
  });
  return { ...resource, quotes: resource.state.status === "success" ? resource.state.data : {} };
}
