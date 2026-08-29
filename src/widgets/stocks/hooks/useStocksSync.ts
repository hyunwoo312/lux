import { createWidgetSync } from "@/widgets/core/useWidgetSync";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useStocksStore } from "@/widgets/stocks/useStocksStore";

export const { useSync: useStocksSync, useSyncStatus: useStocksSyncStatus } = createWidgetSync(
  useStocksStore,
  useWidgetInstanceId,
);
