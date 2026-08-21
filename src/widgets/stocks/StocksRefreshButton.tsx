import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useFreshness } from "@/widgets/core/usePolledResource";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import {
  STOCKS_SYNC_COOLDOWN_MS,
  useStocks,
  useStocksStore,
} from "@/widgets/stocks/useStocksStore";

export function StocksRefreshButton() {
  const freshness = useFreshness("stocks:");
  const instanceId = useWidgetInstanceId();
  const symbols = useStocks((d) => d.symbols);
  const syncing = useStocksStore((s) => (s.syncing[instanceId] ?? 0) > 0);
  const lastSyncAt = useStocksStore((s) => s.lastSyncAt[instanceId]);
  const dataSyncedAt = useStocksStore((s) => s.dataSyncedAt[instanceId]);
  const requestRefresh = useStocksStore((s) => s.requestRefresh);

  if (symbols.length === 0) return null;

  return (
    <WidgetRefreshButton
      label="Stocks"
      syncing={syncing}
      lastSyncAt={lastSyncAt}
      updatedAt={dataSyncedAt}
      freshness={freshness}
      cooldownMs={STOCKS_SYNC_COOLDOWN_MS}
      onRefresh={() => requestRefresh(instanceId)}
    />
  );
}
