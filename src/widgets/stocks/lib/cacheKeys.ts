import type { StockRange, StockHistoryRange } from "@/widgets/stocks/types";

const SHAPE = 3;

function key(rest: string): string {
  return `stocks:v${SHAPE}:${rest}`;
}

export function quoteKey(symbol: string, range: StockRange): string {
  return key(`quote:${symbol}:${range}`);
}

export function sparkKey(symbols: string[], range: StockHistoryRange): string {
  return key(`spark:${range}:${[...new Set(symbols)].sort().join(",")}`);
}

export const TRENDING_KEY = key("trending");
