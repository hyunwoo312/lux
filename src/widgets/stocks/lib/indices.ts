import type { StockRange } from "@/widgets/stocks/types";

export const INDEX_RANGE: StockRange = "1d";

export const MARKET_INDICES = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^DJI", label: "Dow" },
] as const;
