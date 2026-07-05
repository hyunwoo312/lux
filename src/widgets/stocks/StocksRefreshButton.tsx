import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { STOCKS_SYNC_COOLDOWN_MS, useStocks, useStocksStore } from "@/widgets/stocks/useStocksStore";

export function StocksRefreshButton() {
  const instanceId = useWidgetInstanceId();
  const symbols = useStocks((d) => d.symbols);
  const syncing = useStocksStore((s) => (s.syncing[instanceId] ?? 0) > 0);
  const lastSyncAt = useStocksStore((s) => s.lastSyncAt[instanceId]);
  const requestRefresh = useStocksStore((s) => s.requestRefresh);

  if (symbols.length === 0) return null;

  return (
    <WidgetRefreshButton
      syncing={syncing}
      lastSyncAt={lastSyncAt}
      cooldownMs={STOCKS_SYNC_COOLDOWN_MS}
      onRefresh={() => requestRefresh(instanceId)}
    />
  );
}
