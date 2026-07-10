import type { Quote, StockRange } from "@/widgets/stocks/types";

export function quoteCacheKey(symbol: string, range: StockRange): string {
  return `stocks:quote:${symbol}:${range}`;
}

export function referencePrice(quote: Quote, range: StockRange): number {
  if (range === "1d") return quote.previousClose;
  return quote.series[0] ?? quote.previousClose;
}

export function deriveChange(quote: Quote, reference: number): { change: number; percent: number } {
  const change = quote.price - reference;
  const percent = reference !== 0 ? (change / reference) * 100 : 0;
  return { change, percent };
}

export function changeTone(change: number): string {
  return change > 0 ? "text-primary" : change < 0 ? "text-destructive" : "text-muted-foreground";
}

type MarketState = "open" | "closed" | "unknown";

export function marketState(quote: Quote, nowMs: number): MarketState {
  if (quote.sessionStart == null || quote.sessionEnd == null) return "unknown";
  const now = nowMs / 1000;
  return now >= quote.sessionStart && now < quote.sessionEnd ? "open" : "closed";
}

export type ExtendedSession = {
  kind: "pre" | "post";
  price: number;
  change: number;
  percent: number;
};

export function extendedSession(quote: Quote, nowMs: number): ExtendedSession | null {
  const now = nowMs / 1000;
  if (
    quote.postMarketPrice != null &&
    quote.sessionEnd != null &&
    quote.postMarketEnd != null &&
    now >= quote.sessionEnd &&
    now < quote.postMarketEnd
  ) {
    const change = quote.postMarketPrice - quote.price;
    const percent = quote.price !== 0 ? (change / quote.price) * 100 : 0;
    return { kind: "post", price: quote.postMarketPrice, change, percent };
  }
  if (
    quote.preMarketPrice != null &&
    quote.sessionStart != null &&
    quote.preMarketStart != null &&
    now >= quote.preMarketStart &&
    now < quote.sessionStart
  ) {
    const change = quote.preMarketPrice - quote.previousClose;
    const percent = quote.previousClose !== 0 ? (change / quote.previousClose) * 100 : 0;
    return { kind: "pre", price: quote.preMarketPrice, change, percent };
  }
  return null;
}
