import type { Quote, StockRange } from "@/widgets/stocks/types";

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
