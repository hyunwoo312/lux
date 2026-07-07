import { ChartCandlestick } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { StocksWidget } from "@/widgets/stocks/StocksWidget";
import { StocksConfig } from "@/widgets/stocks/StocksConfig";
import { StocksSearch } from "@/widgets/stocks/StocksSearch";
import { StocksRefreshButton } from "@/widgets/stocks/StocksRefreshButton";
import { useStocksStore } from "@/widgets/stocks/useStocksStore";
import { STOCKS_ACCENT } from "@/widgets/stocks/types";

export const stocksPlugin: WidgetPlugin = {
  type: "stocks",
  name: "Stocks",
  icon: ChartCandlestick,
  defaultLayout: { w: 6, h: 6, minW: 6, minH: 6, maxW: 12, maxH: 12 },
  component: StocksWidget,
  configComponent: StocksConfig,
  statusComponent: StocksSearch,
  headerActionComponent: StocksRefreshButton,
  accent: STOCKS_ACCENT,
  removalNote: (instanceId) => {
    const count = useStocksStore.getState().byInstance[instanceId]?.symbols.length ?? 0;
    if (count === 0) return null;
    return `Your ${count} saved ${count === 1 ? "ticker" : "tickers"} will be deleted.`;
  },
};
