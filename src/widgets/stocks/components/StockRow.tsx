import { Skeleton } from "@/components/ui/skeleton";
import { ROW } from "@/lib/row";
import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/widgets/stocks/lib/format";
import { useStockSummary } from "@/widgets/stocks/hooks/useStockSummary";
import { useStocks } from "@/widgets/stocks/useStocksStore";
import { ChangeValue } from "@/widgets/stocks/components/ChangeValue";
import { ExtendedChange } from "@/widgets/stocks/components/ExtendedChange";
import { StockRemoveButton } from "@/widgets/stocks/components/StockRemoveButton";
import { Sparkline } from "@/widgets/stocks/components/Sparkline";
import { ROW_IDENTITY_CLASS } from "@/widgets/stocks/lib/layout";
import type { SparkSeries } from "@/widgets/stocks/types";

type StockRowProps = {
  symbol: string;
  spark: SparkSeries | undefined;
  showSparkline: boolean;
  onSelect: () => void;
  onRemove: () => void;
};

export function StockRow({ symbol, spark, showSparkline, onSelect, onRemove }: StockRowProps) {
  const showName = useStocks((d) => d.showName);
  const changeMode = useStocks((d) => d.changeMode);
  const { state, quote, price, reference, change, percent, direction, extended, points } =
    useStockSummary(symbol, spark);

  const graphClass = cn("min-w-0 flex-1", showName ? "h-7" : "h-5");

  return (
    <div className="group hover:bg-foreground/5 relative rounded-lg transition-colors">
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Show ${symbol} details`}
        className={cn(
          ROW.itemAction,
          "w-full transition-[padding,background-color] duration-200",
          "group-hover:pr-9 group-focus-within:pr-9",
        )}
      >
        <span
          className={cn(
            "flex min-w-0 flex-col",
            showSparkline ? cn(ROW_IDENTITY_CLASS, "shrink-0") : "flex-1",
          )}
        >
          <span className="text-ink truncate text-body leading-tight font-semibold">{symbol}</span>
          {showName && quote?.name ? (
            <span className={cn(TYPE.rowSubtitle, "truncate leading-tight")}>{quote.name}</span>
          ) : null}
        </span>

        {showSparkline ? (
          points.length > 0 ? (
            <Sparkline
              points={points}
              direction={direction}
              baseline={reference ?? undefined}
              className={graphClass}
            />
          ) : state.status === "loading" ? (
            <span className={cn(graphClass, "self-center")}>
              <Skeleton className="size-full" />
            </span>
          ) : (
            <span className={graphClass} />
          )
        ) : null}

        <span className="flex shrink-0 flex-col items-end">
          {price != null ? (
            <>
              <span className="text-ink text-body leading-tight font-semibold tabular-nums slashed-zero">
                {formatNumber(price, quote?.priceHint ?? 2)}
              </span>
              <ChangeValue
                change={change}
                percent={percent}
                mode={changeMode}
                className="leading-tight"
              />
              {extended ? <ExtendedChange extended={extended} /> : null}
            </>
          ) : state.status === "error" ? (
            <span className={cn(TYPE.rowMeta, "text-warning")}>No price</span>
          ) : (
            <Skeleton className="h-4 w-16" />
          )}
        </span>
      </button>

      <StockRemoveButton
        symbol={symbol}
        onRemove={onRemove}
        className="
          absolute top-1/2 right-1.5 -translate-y-1/2 translate-x-2 opacity-0
          group-hover:translate-x-0 group-hover:opacity-100
          group-focus-within:translate-x-0 group-focus-within:opacity-100
        "
      />
    </div>
  );
}
