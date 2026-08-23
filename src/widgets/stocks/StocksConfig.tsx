import {
  ConfigMultiToggle,
  ConfigSegmented,
  WidgetConfigGroup,
  WidgetConfigItem,
} from "@/components/config/WidgetConfig";
import { useStocks, useStocksStore } from "@/widgets/stocks/useStocksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { INDEX_CATALOGUE, MAX_INDICES } from "@/widgets/stocks/lib/indices";
import type { ChangeMode, ChartStyle } from "@/widgets/stocks/types";

const NAME_OPTIONS: { value: "show" | "hide"; label: string }[] = [
  { value: "show", label: "Show" },
  { value: "hide", label: "Hide" },
];

const CHANGE_OPTIONS: { value: ChangeMode; label: string }[] = [
  { value: "percent", label: "Percent" },
  { value: "absolute", label: "Price" },
];

const STYLE_OPTIONS: { value: ChartStyle; label: string }[] = [
  { value: "line", label: "Line" },
  { value: "candle", label: "Candles" },
];

const INDEX_OPTIONS = INDEX_CATALOGUE.map((index) => ({
  value: index.symbol,
  label: index.label,
}));

export function StocksConfig() {
  const instanceId = useWidgetInstanceId();
  const showName = useStocks((d) => d.showName);
  const setShowName = useStocksStore((s) => s.setShowName);
  const changeMode = useStocks((d) => d.changeMode);
  const setChangeMode = useStocksStore((s) => s.setChangeMode);
  const chartStyle = useStocks((d) => d.chartStyle);
  const setChartStyle = useStocksStore((s) => s.setChartStyle);
  const indexSymbols = useStocks((d) => d.indexSymbols);
  const setIndexSymbols = useStocksStore((s) => s.setIndexSymbols);

  return (
    <>
      <WidgetConfigGroup label="Display">
        <WidgetConfigItem
          title="Change"
          description="Show movement as a percentage or in price"
          control={
            <ConfigSegmented
              label="Change"
              value={changeMode}
              options={CHANGE_OPTIONS}
              onChange={(value) => setChangeMode(instanceId, value)}
            />
          }
        />
        <WidgetConfigItem
          title="Chart style"
          description="How the detail chart draws price"
          control={
            <ConfigSegmented
              label="Chart style"
              value={chartStyle}
              options={STYLE_OPTIONS}
              onChange={(value) => setChartStyle(instanceId, value)}
            />
          }
        />
        <WidgetConfigItem
          title="Company name"
          description="Show the company name under each symbol"
          control={
            <ConfigSegmented
              label="Company name"
              value={showName ? "show" : "hide"}
              options={NAME_OPTIONS}
              onChange={(value) => setShowName(instanceId, value === "show")}
            />
          }
        />
      </WidgetConfigGroup>

      <WidgetConfigGroup label="Market rail">
        <WidgetConfigItem
          title="Indices"
          description={`Shown above the watchlist. Pick up to ${MAX_INDICES}.`}
        >
          <ConfigMultiToggle
            label="Market indices"
            values={indexSymbols}
            options={INDEX_OPTIONS}
            maxSelected={MAX_INDICES}
            onChange={(values) => setIndexSymbols(instanceId, values)}
          />
        </WidgetConfigItem>
      </WidgetConfigGroup>

      <WidgetConfigGroup label="About">
        <WidgetConfigItem
          title="Market data"
          description="Quotes from Yahoo Finance; may be delayed"
          control={
            <a
              href="https://finance.yahoo.com/"
              target="_blank"
              rel="noreferrer"
              className="text-ink-3 hover:text-ink text-caption underline underline-offset-2"
            >
              Yahoo Finance
            </a>
          }
        />
      </WidgetConfigGroup>
    </>
  );
}
