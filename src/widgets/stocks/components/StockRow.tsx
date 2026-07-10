import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatPrice, formatSigned } from "@/widgets/stocks/lib/format";
import {
  changeTone,
  deriveChange,
  extendedSession,
  referencePrice,
} from "@/widgets/stocks/lib/quote";
import { useQuote } from "@/widgets/stocks/hooks/useQuote";
import { useStocks } from "@/widgets/stocks/useStocksStore";
import { StockRemoveButton } from "@/widgets/stocks/components/StockRemoveButton";
import { Sparkline } from "@/widgets/stocks/components/Sparkline";

type StockRowProps = {
  symbol: string;
  onSelect: () => void;
  onRemove: () => void;
};

export function StockRow({ symbol, onSelect, onRemove }: StockRowProps) {
  const showName = useStocks((d) => d.showName);
  const { state, data, range } = useQuote(symbol);
  const reference = data ? referencePrice(data, range) : 0;
  const { change, percent } = data ? deriveChange(data, reference) : { change: 0, percent: 0 };
  const tone = changeTone(change);
  const extended = data ? extendedSession(data, Date.now()) : null;
  const graphClass = cn("min-w-0 flex-1", showName ? "h-7" : "h-9");

  return (
    <div className="group relative rounded-lg transition-colors hover:bg-foreground/5">
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Show ${symbol} details`}
        className="
          flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none
          transition-[padding] duration-200
          group-hover:pr-9
          group-focus-within:pr-9
          focus-visible:ring-foreground/30 focus-visible:ring-2 focus-visible:ring-inset
        "
      >
        <div className={cn("flex shrink-0 flex-col", showName ? "w-24" : "w-16")}>
          <span className="text-foreground truncate text-sm leading-tight font-semibold">
            {symbol}
          </span>
          {showName && data?.name ? (
            <span className="text-muted-foreground truncate text-xs leading-tight">
              {data.name}
            </span>
          ) : null}
        </div>

        {data ? (
          <Sparkline
            series={data.series}
            timestamps={data.timestamps}
            currency={data.currency}
            priceHint={data.priceHint}
            range={range}
            tone={tone}
            baseline={reference}
            className={graphClass}
          />
        ) : state.status === "loading" ? (
          <div className={graphClass}>
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <div className={graphClass} />
        )}

        <div className="flex shrink-0 flex-col items-end">
          {data ? (
            <>
              <span className="text-foreground text-sm leading-tight font-semibold tabular-nums">
                {formatPrice(data.price, data.currency, data.priceHint)}
              </span>
              <span className={cn("text-xs leading-tight tabular-nums", tone)}>
                {formatSigned(change)} ({formatSigned(percent)}%)
              </span>
              {extended ? (
                <span
                  className={cn("text-xs leading-tight tabular-nums", changeTone(extended.change))}
                >
                  <span className="text-muted-foreground">
                    {extended.kind === "pre" ? "Pre" : "AH"}{" "}
                  </span>
                  {formatSigned(extended.percent)}%
                </span>
              ) : null}
            </>
          ) : state.status === "error" ? (
            <span className="text-muted-foreground text-xs">Unavailable</span>
          ) : (
            <Skeleton className="h-4 w-16" />
          )}
        </div>
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
