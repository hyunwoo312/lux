import type { AccentPreset } from "@/widgets/core/accent";

export const STOCKS_TINT: AccentPreset = "green";

export const STOCK_RANGES = ["1d", "5d", "1mo", "6mo", "ytd", "1y", "5y"] as const;
export type StockRange = (typeof STOCK_RANGES)[number];

export const DAY_RANGE: StockRange = "1d";

export const RANGE_LABEL: Record<StockRange, string> = {
  "1d": "1D",
  "5d": "5D",
  "1mo": "1M",
  "6mo": "6M",
  ytd: "YTD",
  "1y": "1Y",
  "5y": "5Y",
};

export const STOCK_VIEWS = ["list", "grid"] as const;
export type StockView = (typeof STOCK_VIEWS)[number];

export const CHANGE_MODES = ["percent", "absolute"] as const;
export type ChangeMode = (typeof CHANGE_MODES)[number];

export const CHART_STYLES = ["line", "candle"] as const;
export type ChartStyle = (typeof CHART_STYLES)[number];

export const INSTRUMENT_TYPES = [
  "EQUITY",
  "ETF",
  "INDEX",
  "CRYPTOCURRENCY",
  "CURRENCY",
  "FUTURE",
  "MUTUALFUND",
] as const;
export type InstrumentType = (typeof INSTRUMENT_TYPES)[number];

export type PricePoint = { time: number; close: number };

export type PriceBar = PricePoint & {
  open: number;
  high: number;
  low: number;
  volume: number | null;
};

export type Dividend = { time: number; amount: number };

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
  bars: PriceBar[];
  dayHigh: number | null;
  dayLow: number | null;
  week52High: number | null;
  week52Low: number | null;
  volume: number | null;
  exchange: string | null;
  exchangeTimezone: string | null;
  instrumentType: InstrumentType | null;
  dividends: Dividend[];
};

export type SparkSeries = {
  symbol: string;
  price: number;
  previousClose: number;
  points: PricePoint[];
};

export type SymbolSearchResult = {
  symbol: string;
  name: string;
  exchange: string;
  sector: string | null;
  instrumentType: InstrumentType | null;
};
