import { LineChart, Plus } from "lucide-react";
import { openResult } from "@/widgets/core/commandResult";
import { instanceData, instanceIds } from "@/widgets/core/instances";
import { needsWidget } from "@/widgets/core/commandSetup";
import type { CommandResult, WidgetCommand } from "@/widgets/core/types";
import { readPolled } from "@/widgets/core/usePolledResource";
import { formatSigned } from "@/widgets/stocks/lib/format";
import { stocksSparks, stocksTrending, type SparkMap } from "@/widgets/stocks/lib/resources";
import { searchSymbols } from "@/widgets/stocks/lib/symbols";
import { DEFAULT_DATA, useStocksStore } from "@/widgets/stocks/useStocksStore";
import { DAY_RANGE, type SymbolSearchResult } from "@/widgets/stocks/types";
import { matchesQuery } from "@/widgets/core/commandResult";

const QUOTE_URL = "https://finance.yahoo.com/quote/";

const TRENDING_LIMIT = 12;

type Listing = { symbol: string; name?: string };

function openQuote(symbol: string): void {
  openResult(`${QUOTE_URL}${encodeURIComponent(symbol)}`);
}

function watchlist(): string[] {
  const placed = instanceData("stocks", useStocksStore.getState().byInstance, DEFAULT_DATA);
  return [...new Set(placed.flatMap(({ data }) => data.symbols))];
}

async function priced(listings: Listing[], section: string): Promise<CommandResult[]> {
  const symbols = listings.map((listing) => listing.symbol);
  const map = symbols.length === 0 ? {} : await quotes(symbols);
  return listings.map((listing) => tickerRow(listing, map, section));
}

async function quotes(symbols: string[]): Promise<SparkMap> {
  return readPolled(stocksSparks(symbols, DAY_RANGE)).catch(() => ({}));
}

function tickerRow({ symbol, name }: Listing, map: SparkMap, section: string): CommandResult {
  const series = map[symbol];
  const change =
    series && series.previousClose > 0
      ? ((series.price - series.previousClose) / series.previousClose) * 100
      : null;

  return {
    id: `stocks.ticker.${symbol}`,
    label: symbol,
    detail: name,
    section,
    meta:
      series === undefined
        ? undefined
        : change === null
          ? `$${series.price.toFixed(2)}`
          : `$${series.price.toFixed(2)} ${formatSigned(change)}%`,
    metaTone: change === null || change === 0 ? undefined : change > 0 ? "positive" : "negative",
    icon: LineChart,
    run: () => openQuote(symbol),
  };
}

async function findTickers(query: string, signal: AbortSignal): Promise<CommandResult[]> {
  if (query === "") {
    const trending = await readPolled(stocksTrending);
    return priced(
      trending.slice(0, TRENDING_LIMIT).map((symbol) => ({ symbol })),
      "Trending now",
    );
  }
  const hits: SymbolSearchResult[] = await searchSymbols(query, signal);
  return priced(
    hits.map((hit) => ({ symbol: hit.symbol, name: hit.name })),
    "Search results",
  );
}

const lookUp: WidgetCommand = {
  kind: "provider",
  id: "stocks.lookUp",
  label: "Look up a ticker",
  description: "Find a stock, index, fund or coin and open its quote",
  icon: LineChart,
  keywords: ["stock", "ticker", "symbol", "quote", "price", "share", "crypto", "trending"],
  placeholder: "Search tickers",
  emptyMessage: (query) =>
    query === "" ? "Nothing trending right now." : `No ticker matched “${query}”.`,
  search: (query, signal) => findTickers(query.trim(), signal),
};

const watchlistCommand: WidgetCommand = {
  kind: "provider",
  id: "stocks.watchlist",
  label: "Watchlist",
  description: "See what everything you follow is doing right now",
  icon: LineChart,
  keywords: ["stock", "ticker", "price", "portfolio", "following"],
  placeholder: "Search your watchlist",
  emptyMessage: (query) =>
    query === "" ? "Nothing on your watchlist yet." : `Nothing you follow matched “${query}”.`,
  search: async (query) => {
    const needle = query.trim();
    const symbols = watchlist().filter((symbol) => matchesQuery(symbol, needle));
    return priced(
      symbols.map((symbol) => ({ symbol })),
      "Watchlist",
    );
  },
};

function addTickerCommand(instanceId: string): WidgetCommand {
  return {
    kind: "provider",
    id: "stocks.addSymbol",
    label: "Add a ticker",
    description: "Follow a stock, index, fund or coin on your watchlist",
    icon: Plus,
    keywords: ["stock", "ticker", "symbol", "watchlist", "follow", "track"],
    placeholder: "Search tickers to add",
    emptyMessage: (query) =>
      query === "" ? "Nothing trending right now." : `No ticker matched “${query}”.`,
    search: async (query, signal) =>
      (await findTickers(query.trim(), signal)).map((row) => ({
        ...row,
        run: () => useStocksStore.getState().addSymbol(instanceId, row.label),
      })),
  };
}

export const stocksCommands = (): WidgetCommand[] => {
  const [instanceId] = instanceIds("stocks");
  return [
    lookUp,
    watchlistCommand,
    { ...addTickerCommand(instanceId ?? ""), setup: () => needsWidget("stocks", "Stocks") },
  ];
};
