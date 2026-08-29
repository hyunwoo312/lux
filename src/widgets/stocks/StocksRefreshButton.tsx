import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useFreshness } from "@/widgets/core/usePolledResource";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useStocksSyncStatus } from "@/widgets/stocks/hooks/useStocksSync";
import {
  STOCKS_SYNC_COOLDOWN_MS,
  useStocks,
  useStocksStore,
} from "@/widgets/stocks/useStocksStore";

export function StocksRefreshButton() {
  const freshness = useFreshness("stocks:");
  const instanceId = useWidgetInstanceId();
  const symbols = useStocks((d) => d.symbols);
  const status = useStocksSyncStatus();
  const requestSync = useStocksStore((s) => s.requestSync);

  if (symbols.length === 0) return null;

  return (
    <WidgetRefreshButton
      label="Stocks"
      {...status}
      freshness={freshness}
      cooldownMs={STOCKS_SYNC_COOLDOWN_MS}
      onRefresh={() => requestSync(instanceId)}
    />
  );
}
