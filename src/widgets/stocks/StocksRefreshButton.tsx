import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import {
  refreshPolledResource,
  staleSinceOf,
  useFreshness,
  useResourceGroup,
} from "@/widgets/core/usePolledResource";
import { quoteKey, sparkKey } from "@/widgets/stocks/lib/cacheKeys";
import { STOCKS_SYNC_COOLDOWN_MS, useStocks } from "@/widgets/stocks/useStocksStore";
import { DAY_RANGE } from "@/widgets/stocks/types";

export function StocksRefreshButton() {
  const staleSince = staleSinceOf(useFreshness("stocks:"));
  const symbols = useStocks((d) => d.symbols);
  const indexSymbols = useStocks((d) => d.indexSymbols);
  const range = useStocks((d) => d.range);

  const keys = [
    sparkKey(symbols, DAY_RANGE),
    ...symbols.map((symbol) => quoteKey(symbol, DAY_RANGE)),
    ...(range === DAY_RANGE ? [] : symbols.map((symbol) => quoteKey(symbol, range))),
    ...(indexSymbols.length > 0 ? [sparkKey(indexSymbols, DAY_RANGE)] : []),
  ];
  const { isRefreshing, lastRequestedAt, lastSyncedAt } = useResourceGroup(keys);

  if (symbols.length === 0) return null;

  return (
    <WidgetRefreshButton
      label="Stocks"
      syncing={isRefreshing}
      lastSyncAt={lastRequestedAt || undefined}
      updatedAt={lastSyncedAt}
      staleSince={staleSince}
      cooldownMs={STOCKS_SYNC_COOLDOWN_MS}
      onRefresh={() => keys.forEach(refreshPolledResource)}
    />
  );
}
