import { LayoutToggle } from "@/widgets/core/LayoutToggle";
import { useStocks, useStocksStore } from "@/widgets/stocks/useStocksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function StocksLayoutToggle() {
  const instanceId = useWidgetInstanceId();
  const view = useStocks((d) => d.view);
  const setView = useStocksStore((s) => s.setView);
  return <LayoutToggle value={view} onChange={(next) => setView(instanceId, next)} />;
}
