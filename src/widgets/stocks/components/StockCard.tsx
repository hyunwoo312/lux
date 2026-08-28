import { Skeleton } from "@/components/ui/skeleton";
import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";
import { formatNumber, formatVolume } from "@/widgets/stocks/lib/format";
import { useStockSummary } from "@/widgets/stocks/hooks/useStockSummary";
import { useStocks } from "@/widgets/stocks/useStocksStore";
import { ChangeValue } from "@/widgets/stocks/components/ChangeValue";
import { ExtendedChange } from "@/widgets/stocks/components/ExtendedChange";
import { StockRemoveButton } from "@/widgets/stocks/components/StockRemoveButton";
import { Sparkline } from "@/widgets/stocks/components/Sparkline";
import type { SparkSeries } from "@/widgets/stocks/types";

type StockCardProps = {
  symbol: string;
  spark: SparkSeries | undefined;
  onSelect: () => void;
  onRemove: () => void;
};

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 items-baseline gap-1">
      <span className="text-ink-3 shrink-0 text-micro">{label}</span>
      <span className="text-ink-2 truncate text-micro tabular-nums slashed-zero">{value}</span>
    </span>
  );
}

export function StockCard({ symbol, spark, onSelect, onRemove }: StockCardProps) {
  const showName = useStocks((d) => d.showName);
  const changeMode = useStocks((d) => d.changeMode);
  const { state, quote, price, reference, change, percent, direction, extended, points } =
    useStockSummary(symbol, spark);

  const priceHint = quote?.priceHint ?? 2;
  const dayRange =
    quote?.dayLow != null && quote.dayHigh != null
      ? `${formatNumber(quote.dayLow, priceHint)}–${formatNumber(quote.dayHigh, priceHint)}`
      : null;

  return (
    <div
      className="
        group bg-foreground/5
        hover:bg-foreground/10
        relative h-full rounded-lg transition-colors
      "
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Show ${symbol} details`}
        className="
          focus-ring flex h-full w-full cursor-pointer flex-col gap-1.5 rounded-lg p-2 text-left
        "
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-ink truncate text-body leading-tight font-semibold">{symbol}</span>
          {showName && quote?.name ? (
            <span className={cn(TYPE.rowMeta, "truncate leading-tight")}>{quote.name}</span>
          ) : null}
        </span>

        {price != null ? (
          <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="text-ink text-body-lg leading-none font-semibold tabular-nums slashed-zero">
              {formatNumber(price, priceHint)}
            </span>
            <ChangeValue change={change} percent={percent} mode={changeMode} variant="chip" />
          </span>
        ) : state.status === "error" ? (
          <span className={cn(TYPE.rowMeta, "text-warning")}>No price</span>
        ) : (
          <Skeleton className="h-5 w-20" />
        )}

        {points.length > 0 ? (
          <Sparkline
            points={points}
            direction={direction}
            baseline={reference ?? undefined}
            className="min-h-6 w-full flex-1"
          />
        ) : (
          <span className="min-h-6 w-full flex-1" />
        )}

        <span className="flex min-w-0 flex-col gap-0.5">
          {dayRange ? <Meta label="Day" value={dayRange} /> : null}
          <span className="flex min-w-0 items-baseline justify-between gap-2">
            {quote?.volume != null ? <Meta label="Vol" value={formatVolume(quote.volume)} /> : null}
            {extended ? <ExtendedChange extended={extended} className="shrink-0" /> : null}
          </span>
        </span>
      </button>

      <StockRemoveButton
        symbol={symbol}
        onRemove={onRemove}
        className="
          absolute top-1 right-1 scale-90 opacity-0 transition duration-200
          group-focus-within:scale-100 group-focus-within:opacity-100
          group-hover:scale-100 group-hover:opacity-100
        "
      />
    </div>
  );
}
