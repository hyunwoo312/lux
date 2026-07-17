import type { AccentPreset } from "@/widgets/core/accent";

export const STOCKS_ACCENT: AccentPreset = "green";

export const STOCK_RANGES = ["1d", "5d", "1mo", "6mo", "1y", "ytd", "5y", "max"] as const;
export type StockRange = (typeof STOCK_RANGES)[number];

export const STOCK_SORTS = ["manual", "change", "alpha"] as const;
export type StockSort = (typeof STOCK_SORTS)[number];

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  currency: string;
  priceHint: number;
  asOf: number | null;
  sessionStart: number | null;
  sessionEnd: number | null;
  preMarketPrice: number | null;
  postMarketPrice: number | null;
  preMarketStart: number | null;
  postMarketEnd: number | null;
  series: number[];
  timestamps: number[];
  dayHigh: number | null;
  dayLow: number | null;
  week52High: number | null;
  week52Low: number | null;
  volume: number | null;
  exchange: string | null;
};

export type SymbolSearchResult = {
  symbol: string;
  name: string;
  exchange: string;
};
