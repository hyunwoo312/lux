import type { Quote, SparkSeries, StockRange } from "@/widgets/stocks/types";

export type ChangeDirection = "up" | "down" | "flat";

export function changeOf(price: number, reference: number): { change: number; percent: number } {
  const change = price - reference;
  return { change, percent: reference !== 0 ? (change / reference) * 100 : 0 };
}

function referenceFor(range: StockRange, previousClose: number, first: number | undefined): number {
  if (range === "1d") return previousClose;
  return first ?? previousClose;
}

export function referencePrice(quote: Quote, range: StockRange): number {
  return referenceFor(range, quote.previousClose, quote.bars[0]?.close);
}

export function sparkReference(spark: SparkSeries, range: StockRange): number {
  return referenceFor(range, spark.previousClose, spark.points[0]?.close);
}

export function directionOf(change: number): ChangeDirection {
  return change > 0 ? "up" : change < 0 ? "down" : "flat";
}

export function changeTone(direction: ChangeDirection): string {
  if (direction === "up") return "text-success";
  if (direction === "down") return "text-destructive";
  return "text-ink-3";
}

type MarketState = "open" | "closed" | "unknown";

export function marketState(quote: Quote, nowMs: number): MarketState {
  if (quote.sessionStart == null || quote.sessionEnd == null) return "unknown";
  const now = nowMs / 1000;
  return now >= quote.sessionStart && now < quote.sessionEnd ? "open" : "closed";
}

export function isAlwaysOpen(quote: Quote): boolean {
  return quote.instrumentType === "CRYPTOCURRENCY" || quote.instrumentType === "CURRENCY";
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
    return {
      kind: "post",
      price: quote.postMarketPrice,
      ...changeOf(quote.postMarketPrice, quote.price),
    };
  }
  if (
    quote.preMarketPrice != null &&
    quote.sessionStart != null &&
    quote.preMarketStart != null &&
    now >= quote.preMarketStart &&
    now < quote.sessionStart
  ) {
    return {
      kind: "pre",
      price: quote.preMarketPrice,
      ...changeOf(quote.preMarketPrice, quote.previousClose),
    };
  }
  return null;
}
