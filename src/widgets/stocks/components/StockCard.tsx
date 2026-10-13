import { Skeleton } from "@/components/ui/skeleton";
import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";
import { formatNumber, formatVolume } from "@/widgets/stocks/lib/format";
import { stockSummary, type SummaryMetadata } from "@/widgets/stocks/lib/summary";
import { useStocks } from "@/widgets/stocks/useStocksStore";
import { ChangeValue } from "@/widgets/stocks/components/ChangeValue";
import { ExtendedChange } from "@/widgets/stocks/components/ExtendedChange";
import { StockRemoveButton } from "@/widgets/stocks/components/StockRemoveButton";
import { Sparkline } from "@/widgets/stocks/components/Sparkline";
import type { SparkSeries } from "@/widgets/stocks/types";
import { ROW } from "@/lib/row";
import { useSparkResource } from "@/widgets/stocks/hooks/useSparks";
import { changeOf, directionOf } from "@/widgets/stocks/lib/quote";
import { RANGE_LABEL } from "@/widgets/stocks/types";
import { formatSigned } from "@/widgets/stocks/lib/format";

type StockCardProps = {
  symbol: string;
  spark: SparkSeries | undefined;
  now: number;
  metadata: SummaryMetadata;
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

export function StockCard({ symbol, spark, now, metadata, onSelect, onRemove }: StockCardProps) {
  const showName = useStocks((d) => d.showName);
  const changeMode = useStocks((d) => d.changeMode);
  const range = useStocks((d) => d.range);
  const symbols = useStocks((d) => d.symbols);
  const history = useSparkResource(range === "1d" ? [] : symbols, range);
  const { state, quote, price, reference, change, percent, direction, extended, points } =
    stockSummary(spark, now, metadata);

  const priceHint = quote?.priceHint ?? 2;
  const chartPoints = range === "1d" ? points : (history.map?.[symbol]?.points ?? []);
  const chartBase = range === "1d" ? reference : chartPoints[0]?.close;
  const chartReturn =
    chartPoints.length > 1 && chartBase != null && chartBase > 0
      ? changeOf(chartPoints.at(-1)!.close, chartBase).percent
      : null;
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
        ) : state.status === "error" || state.status === "empty" ? (
          <span className={cn(TYPE.rowMeta, "text-warning")}>No price</span>
        ) : (
          <Skeleton className="h-5 w-20" />
        )}

        {chartPoints.length > 0 ? (
          <Sparkline
            points={chartPoints}
            direction={range === "1d" ? direction : directionOf(chartReturn ?? 0)}
            baseline={chartBase ?? undefined}
            className="min-h-6 w-full flex-1"
          />
        ) : (
          <span className="min-h-6 w-full flex-1" />
        )}

        <span className="flex min-w-0 flex-col gap-0.5">
          <Meta
            label={`${RANGE_LABEL[range]} chart`}
            value={chartReturn == null ? "—" : `${formatSigned(chartReturn)}%`}
          />
          <span className="text-ink-3 text-micro">Quote change · latest session</span>
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
        className={cn("absolute top-1 right-1", ROW.reveal)}
      />
    </div>
  );
}
