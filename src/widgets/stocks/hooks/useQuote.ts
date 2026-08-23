import { useCallback } from "react";
import { peekPolledResource, usePolledResource } from "@/widgets/core/usePolledResource";
import { quoteKey } from "@/widgets/stocks/lib/cacheKeys";
import { fetchQuote, parseCachedQuote } from "@/widgets/stocks/lib/quotes";
import { extendedSession, isAlwaysOpen, marketState } from "@/widgets/stocks/lib/quote";
import { useStocks } from "@/widgets/stocks/useStocksStore";
import type { Quote, StockRange } from "@/widgets/stocks/types";

const FOCUSED_OPEN_MS = 60_000;
const FOCUSED_CLOSED_MS = 10 * 60_000;
const BACKGROUND_MS = 15 * 60_000;

function focusedInterval(quote: Quote | undefined, nowMs: number): number {
  if (!quote) return FOCUSED_OPEN_MS;
  if (isAlwaysOpen(quote)) return FOCUSED_OPEN_MS;
  const idle = marketState(quote, nowMs) === "closed" && !extendedSession(quote, nowMs);
  return idle ? FOCUSED_CLOSED_MS : FOCUSED_OPEN_MS;
}

type QuoteOptions = { range?: StockRange; focused?: boolean };

export function useQuote(
  symbol: string,
  { range: rangeOverride, focused = false }: QuoteOptions = {},
) {
  const storeRange = useStocks((d) => d.range);
  const range = rangeOverride ?? storeRange;
  const cacheKey = quoteKey(symbol, range);

  const fetcher = useCallback(
    (signal: AbortSignal) => fetchQuote(symbol, range, signal),
    [symbol, range],
  );

  const resource = usePolledResource(fetcher, {
    intervalMs: focused
      ? focusedInterval(peekPolledResource<Quote>(cacheKey), Date.now())
      : BACKGROUND_MS,
    cacheKey,
    persist: true,
    parsePersisted: parseCachedQuote,
  });

  return {
    ...resource,
    data: resource.state.status === "success" ? resource.state.data : null,
    range,
  };
}
