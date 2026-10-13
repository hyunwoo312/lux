import { Skeleton } from "@/components/ui/skeleton";
import { ROW } from "@/lib/row";
import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";
import { formatNumber, formatVolume } from "@/widgets/stocks/lib/format";
import { stockSummary, type SummaryMetadata } from "@/widgets/stocks/lib/summary";
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
  now: number;
  showSparkline: boolean;
  showVolume?: boolean;
  metadata: SummaryMetadata;
  onSelect: () => void;
  onRemove: () => void;
};

export function StockRow({
  symbol,
  spark,
  now,
  showSparkline,
  showVolume,
  metadata,
  onSelect,
  onRemove,
}: StockRowProps) {
  const showName = useStocks((d) => d.showName);
  const changeMode = useStocks((d) => d.changeMode);
  const { state, quote, price, reference, change, percent, direction, extended, points } =
    stockSummary(spark, now, metadata);

  const graphClass = cn("min-w-0 flex-1", showName ? "h-7" : "h-5");

  return (
    <div className="group relative rounded-lg">
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Show ${symbol} details`}
        className={cn(
          ROW.itemAction,
          ROW.revealPad,
          "w-full group-hover:pr-9 group-focus-within:pr-9",
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
            <span className={cn(TYPE.rowMeta, "truncate leading-tight")}>{quote.name}</span>
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

        {showVolume && (
          <span className="text-ink-3 shrink-0 text-caption tabular-nums" title="Volume">
            {quote?.volume != null ? formatVolume(quote.volume) : "—"}
          </span>
        )}
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
          ) : state.status === "error" || state.status === "empty" ? (
            <span className={cn(TYPE.rowMeta, "text-warning")}>No price</span>
          ) : (
            <Skeleton className="h-4 w-16" />
          )}
        </span>
      </button>

      <StockRemoveButton symbol={symbol} onRemove={onRemove} className={ROW.revealTrailing} />
    </div>
  );
}
