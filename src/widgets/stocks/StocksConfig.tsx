import {
  ConfigSegmented,
  ConfigSelect,
  WidgetConfigGroup,
  WidgetConfigItem,
} from "@/components/config/WidgetConfig";
import { useStocks, useStocksStore } from "@/widgets/stocks/useStocksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { StockRange, StockSort } from "@/widgets/stocks/types";

const RANGE_OPTIONS: { value: StockRange; label: string }[] = [
  { value: "1d", label: "1 day" },
  { value: "5d", label: "5 days" },
  { value: "1mo", label: "1 month" },
  { value: "6mo", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "ytd", label: "YTD" },
  { value: "5y", label: "5 years" },
  { value: "max", label: "Max" },
];

const NAME_OPTIONS: { value: "show" | "hide"; label: string }[] = [
  { value: "show", label: "Show" },
  { value: "hide", label: "Hide" },
];

const SORT_OPTIONS: { value: StockSort; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "change", label: "% change" },
  { value: "alpha", label: "A–Z" },
];

export function StocksConfig() {
  const instanceId = useWidgetInstanceId();
  const range = useStocks((d) => d.range);
  const setRange = useStocksStore((s) => s.setRange);
  const showName = useStocks((d) => d.showName);
  const setShowName = useStocksStore((s) => s.setShowName);
  const sort = useStocks((d) => d.sort);
  const setSort = useStocksStore((s) => s.setSort);

  return (
    <>
      <WidgetConfigGroup label="Display">
        <WidgetConfigItem
          title="Range"
          description="Time span of the row chart"
          control={
            <ConfigSelect
              label="Chart range"
              value={range}
              options={RANGE_OPTIONS}
              onChange={(value) => setRange(instanceId, value)}
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
        <WidgetConfigItem
          title="Sort"
          description="Order the watchlist (Manual allows drag)"
          control={
            <ConfigSelect
              label="Sort"
              value={sort}
              options={SORT_OPTIONS}
              onChange={(value) => setSort(instanceId, value)}
            />
          }
        />
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
              className="
                text-muted-foreground
                hover:text-foreground
                text-xs underline underline-offset-2
              "
            >
              Yahoo Finance
            </a>
          }
        />
      </WidgetConfigGroup>
    </>
  );
}
