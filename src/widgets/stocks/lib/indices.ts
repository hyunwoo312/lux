export const MAX_INDICES = 6;

export const INDEX_CATALOGUE: { symbol: string; label: string }[] = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^DJI", label: "Dow" },
  { symbol: "^RUT", label: "Russell 2000" },
  { symbol: "^VIX", label: "VIX" },
  { symbol: "^FTSE", label: "FTSE 100" },
  { symbol: "^GDAXI", label: "DAX" },
  { symbol: "^STOXX50E", label: "Euro Stoxx 50" },
  { symbol: "^N225", label: "Nikkei 225" },
  { symbol: "^HSI", label: "Hang Seng" },
  { symbol: "^KS11", label: "KOSPI" },
  { symbol: "^TNX", label: "US 10Y" },
  { symbol: "DX-Y.NYB", label: "Dollar" },
  { symbol: "EURUSD=X", label: "EUR/USD" },
  { symbol: "GC=F", label: "Gold" },
  { symbol: "CL=F", label: "Crude Oil" },
  { symbol: "BTC-USD", label: "Bitcoin" },
  { symbol: "ETH-USD", label: "Ethereum" },
];

export const DEFAULT_INDICES = ["^GSPC", "^IXIC", "^DJI"];

const BY_SYMBOL = new Map(INDEX_CATALOGUE.map((index) => [index.symbol, index]));

export function indexLabel(symbol: string): string {
  return BY_SYMBOL.get(symbol)?.label ?? symbol;
}
