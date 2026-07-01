import { Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatPrice, formatSigned, formatVolume } from "@/widgets/stocks/lib/format";
import { changeTone, deriveChange, marketState, referencePrice } from "@/widgets/stocks/lib/quote";
import { useQuote } from "@/widgets/stocks/hooks/useQuote";
import { StockRemoveButton } from "@/widgets/stocks/components/StockRemoveButton";
import { Sparkline } from "@/widgets/stocks/components/Sparkline";
import type { Quote, StockRange } from "@/widgets/stocks/types";

function formatRange(low: number | null, high: number | null, currency: string): string {
  if (low == null || high == null) return "—";
  return `${formatPrice(low, currency)} – ${formatPrice(high, currency)}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-foreground truncate text-sm tabular-nums">{value}</dd>
    </div>
  );
}

function RangeBar({ low, high, value }: { low: number; high: number; value: number }) {
  const fraction = high > low ? Math.min(1, Math.max(0, (value - low) / (high - low))) : 0.5;
  return (
    <div className="bg-muted relative mt-1 h-1 rounded-full">
      <div
        className="
          bg-foreground absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full
        "
        style={{ left: `${fraction * 100}%` }}
      />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
    </div>
  );
}

function DetailBody({ data, range }: { data: Quote; range: StockRange }) {
  const reference = referencePrice(data, range);
  const { change, percent } = deriveChange(data, reference);
  const tone = changeTone(change);
  const market = marketState(data, Date.now());
  const asOf =
    data.asOf != null
      ? new Date(data.asOf).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      : null;

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      <div className="pr-16">
        <div className="flex items-baseline gap-2">
          <span className="text-foreground text-lg leading-tight font-semibold">{data.symbol}</span>
          <span className="text-muted-foreground min-w-0 truncate text-sm">{data.name}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-foreground text-2xl font-semibold tabular-nums">
            {formatPrice(data.price, data.currency)}
          </span>
          <span className={cn("text-sm tabular-nums", tone)}>
            {formatSigned(change)} ({formatSigned(percent)}%)
          </span>
        </div>
        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
          {market === "open" ? (
            <>
              <span className="bg-primary size-1.5 rounded-full" />
              Live
            </>
          ) : market === "closed" ? (
            asOf ? (
              `Closed · as of ${asOf}`
            ) : (
              "Closed"
            )
          ) : asOf ? (
            `As of ${asOf}`
          ) : null}
        </div>
      </div>

      <Sparkline
        series={data.series}
        timestamps={data.timestamps}
        currency={data.currency}
        range={range}
        tone={tone}
        baseline={reference}
        variant="detail"
        className="h-16 w-full shrink-0"
      />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="col-span-2 flex flex-col gap-0.5">
          <dt className="text-muted-foreground text-xs">Day range</dt>
          <dd className="text-foreground text-sm tabular-nums">
            {formatRange(data.dayLow, data.dayHigh, data.currency)}
          </dd>
          {data.dayLow != null && data.dayHigh != null ? (
            <RangeBar low={data.dayLow} high={data.dayHigh} value={data.price} />
          ) : null}
        </div>
        <Stat label="Prev close" value={formatPrice(data.previousClose, data.currency)} />
        <Stat
          label="52-wk range"
          value={formatRange(data.week52Low, data.week52High, data.currency)}
        />
        <Stat label="Volume" value={data.volume != null ? formatVolume(data.volume) : "—"} />
        {data.exchange ? <Stat label="Exchange" value={data.exchange} /> : null}
      </dl>
    </div>
  );
}

type StockDetailProps = {
  symbol: string;
  onRemove: () => void;
};

export function StockDetail({ symbol, onRemove }: StockDetailProps) {
  const { state, data, refresh, isRefreshing, range } = useQuote(symbol);

  return (
    <div className="relative h-full">
      <button
        type="button"
        onClick={refresh}
        disabled={isRefreshing}
        aria-label={`Refresh ${symbol}`}
        className="
          text-muted-foreground/60
          hover:text-foreground
          absolute top-0 right-8 z-10 grid size-7 place-items-center transition
          [&_svg]:size-4
        "
      >
        <RotateCw className={isRefreshing ? "animate-spin" : undefined} />
      </button>
      <StockRemoveButton
        symbol={symbol}
        onRemove={onRemove}
        className="absolute top-0 right-0 z-10"
      />
      {data ? (
        <DetailBody data={data} range={range} />
      ) : state.status === "error" ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
          <p className="text-muted-foreground text-sm">Couldn’t load {symbol}.</p>
          <Button size="sm" variant="outline" onClick={refresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Retrying…
              </>
            ) : (
              "Retry"
            )}
          </Button>
        </div>
      ) : (
        <DetailSkeleton />
      )}
    </div>
  );
}
