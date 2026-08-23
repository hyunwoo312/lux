import type { StockRange } from "@/widgets/stocks/types";

const SHAPE = 2;

function key(rest: string): string {
  return `stocks:v${SHAPE}:${rest}`;
}

export function quoteKey(symbol: string, range: StockRange): string {
  return key(`quote:${symbol}:${range}`);
}

export function sparkKey(symbols: string[], range: StockRange): string {
  return key(`spark:${range}:${symbols.join(",")}`);
}

export const TRENDING_KEY = key("trending");
