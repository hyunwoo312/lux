import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import {
  refreshPolledResource,
  staleSinceOf,
  useFreshness,
  useResourceGroup,
} from "@/widgets/core/usePolledResource";
import { quoteKey, sparkKey } from "@/widgets/stocks/lib/cacheKeys";
import {
  STOCKS_SYNC_COOLDOWN_MS,
  useStocks,
  useStocksStore,
} from "@/widgets/stocks/useStocksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useDetailSymbol } from "@/widgets/stocks/hooks/useDetailSymbol";
import { DAY_RANGE } from "@/widgets/stocks/types";

export function StocksRefreshButton() {
  const instanceId = useWidgetInstanceId();
  const comparison = useStocksStore((state) => state.comparisonByInstance[instanceId]);
  const detail = useDetailSymbol();
  const staleSince = staleSinceOf(useFreshness("stocks:"));
  const symbols = useStocks((d) => d.symbols);
  const indexSymbols = useStocks((d) => d.indexSymbols);
  const range = useStocks((d) => d.range);
  const view = useStocks((d) => d.view);
  const selectedSymbol = useStocks((d) => d.selectedSymbol);
  const choices = [...new Set([...(detail ? [detail] : []), ...symbols, "SPY", "QQQ"])];
  const valid = comparison?.filter((symbol) => choices.includes(symbol));
  const compared = valid && valid.length >= 2 ? valid : choices.slice(0, 2);

  const keys = [
    sparkKey(symbols, DAY_RANGE),
    `${sparkKey(symbols, DAY_RANGE)}:metadata`,
    sparkKey(symbols, range),
    ...(detail
      ? [sparkKey(compared, range), quoteKey(detail, range), quoteKey(detail, DAY_RANGE)]
      : []),
    ...(view === "performance" ? [sparkKey(symbols, "2y")] : []),
    ...(selectedSymbol ? [quoteKey(selectedSymbol, range)] : []),
    ...symbols.map((symbol) => quoteKey(symbol, DAY_RANGE)),
    ...(range === DAY_RANGE ? [] : symbols.map((symbol) => quoteKey(symbol, range))),
    ...(indexSymbols.length > 0 ? [sparkKey(indexSymbols, DAY_RANGE)] : []),
  ];
  const { isRefreshing, lastRequestedAt, lastSyncedAt } = useResourceGroup(keys);

  if (symbols.length === 0 && indexSymbols.length === 0) return null;

  return (
    <WidgetRefreshButton
      label="Stocks"
      syncing={isRefreshing}
      lastSyncAt={lastRequestedAt || undefined}
      updatedAt={lastSyncedAt}
      staleSince={staleSince}
      cooldownMs={STOCKS_SYNC_COOLDOWN_MS}
      onRefresh={() => [...new Set(keys)].forEach(refreshPolledResource)}
    />
  );
}
