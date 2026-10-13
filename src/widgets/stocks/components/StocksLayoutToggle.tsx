import { ConfigSelect } from "@/components/config/Config";
import { List, LayoutGrid, ChartNoAxesColumnIncreasing, Grid2X2 } from "lucide-react";
import { useStocks, useStocksStore } from "@/widgets/stocks/useStocksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function StocksLayoutToggle() {
  const instanceId = useWidgetInstanceId();
  const view = useStocks((d) => d.view);
  const setView = useStocksStore((s) => s.setView);
  return (
    <ConfigSelect
      label="Watchlist view"
      icon={
        view === "list"
          ? List
          : view === "grid"
            ? LayoutGrid
            : view === "performance"
              ? ChartNoAxesColumnIncreasing
              : Grid2X2
      }
      value={view}
      options={[
        { value: "list", label: "List" },
        { value: "grid", label: "Cards" },
        { value: "performance", label: "Performance" },
        { value: "heatmap", label: "Heatmap" },
      ]}
      onChange={(next) => setView(instanceId, next)}
      triggerClassName="h-7 w-36 gap-1.5 text-caption"
    />
  );
}
