import { LayoutGrid, List } from "lucide-react";
import { ViewToggleButton } from "@/widgets/core/ViewToggleButton";
import { useStocks, useStocksStore } from "@/widgets/stocks/useStocksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function StocksLayoutToggle() {
  const instanceId = useWidgetInstanceId();
  const view = useStocks((d) => d.view);
  const setView = useStocksStore((s) => s.setView);
  const isGrid = view === "grid";

  return (
    <ViewToggleButton
      targetKey={isGrid ? "list" : "grid"}
      targetLabel={isGrid ? "list view" : "grid view"}
      icon={isGrid ? List : LayoutGrid}
      onToggle={() => setView(instanceId, isGrid ? "list" : "grid")}
    />
  );
}
