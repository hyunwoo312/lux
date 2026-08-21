import { RotateCw } from "lucide-react";
import { RetryButton, StateMessage } from "@/components/StateMessage";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  formatCountdown,
  formatPrice,
  formatSigned,
  formatVolume,
} from "@/widgets/stocks/lib/format";
import {
  changeTone,
  deriveChange,
  extendedSession,
  marketState,
  referencePrice,
} from "@/widgets/stocks/lib/quote";
import { useQuote } from "@/widgets/stocks/hooks/useQuote";
import { StockRemoveButton } from "@/widgets/stocks/components/StockRemoveButton";
import { Sparkline } from "@/widgets/stocks/components/Sparkline";
import type { Quote, StockRange } from "@/widgets/stocks/types";

function formatRange(
  low: number | null,
  high: number | null,
  currency: string,
  priceHint: number,
): string {
  if (low == null || high == null) return "—";
  return `${formatPrice(low, currency, priceHint)} – ${formatPrice(high, currency, priceHint)}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-ink-3 text-caption">{label}</dt>
      <dd className="text-ink truncate text-body tabular-nums">{value}</dd>
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
  const clock24h = useAppSettingsStore((state) => state.clock24h);
  const reference = referencePrice(data, range);
  const { change, percent } = deriveChange(data, reference);
  const tone = changeTone(change);
  const now = Date.now();
  const market = marketState(data, now);
  const extended = extendedSession(data, now);
  const opensInMs = data.sessionStart != null ? data.sessionStart * 1000 - now : null;
  const asOf =
    data.asOf != null
      ? new Date(data.asOf).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
          hour12: !clock24h,
        })
      : null;

  return (
    <div className="flex h-full flex-col gap-3 scroll-fade overflow-y-auto">
      <div className="pr-16">
        <div className="flex items-baseline gap-2">
          <span className="text-ink text-lg leading-tight font-semibold">{data.symbol}</span>
          <span className="text-ink-3 min-w-0 truncate text-body">{data.name}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-ink text-2xl font-semibold tabular-nums">
            {formatPrice(data.price, data.currency, data.priceHint)}
          </span>
          <span className={cn("text-body tabular-nums", tone)}>
            {formatSigned(change)} ({formatSigned(percent)}%)
          </span>
        </div>
        <div className="text-ink-3 mt-1 flex items-center gap-1.5 text-caption">
          {market === "open" ? (
            <>
              <span className="bg-primary size-1.5 rounded-full" />
              Live
            </>
          ) : market === "closed" ? (
            opensInMs != null && opensInMs > 0 ? (
              `Opens in ${formatCountdown(opensInMs)}`
            ) : asOf ? (
              `Closed · as of ${asOf}`
            ) : (
              "Closed"
            )
          ) : asOf ? (
            `As of ${asOf}`
          ) : null}
        </div>
        {extended ? (
          <div className="mt-1 flex items-baseline gap-1.5 text-caption">
            <span className="text-ink-3">
              {extended.kind === "pre" ? "Pre-market" : "After hours"}
            </span>
            <span className="text-ink tabular-nums">
              {formatPrice(extended.price, data.currency, data.priceHint)}
            </span>
            <span className={cn("tabular-nums", changeTone(extended.change))}>
              {formatSigned(extended.change)} ({formatSigned(extended.percent)}%)
            </span>
          </div>
        ) : null}
      </div>

      <Sparkline
        series={data.series}
        timestamps={data.timestamps}
        currency={data.currency}
        priceHint={data.priceHint}
        range={range}
        tone={tone}
        baseline={reference}
        variant="detail"
        className="h-16 w-full shrink-0"
      />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="col-span-2 flex flex-col gap-0.5">
          <dt className="text-ink-3 text-caption">Day range</dt>
          <dd className="text-ink text-body tabular-nums">
            {formatRange(data.dayLow, data.dayHigh, data.currency, data.priceHint)}
          </dd>
          {data.dayLow != null && data.dayHigh != null ? (
            <RangeBar low={data.dayLow} high={data.dayHigh} value={data.price} />
          ) : null}
        </div>
        <Stat
          label="Prev close"
          value={formatPrice(data.previousClose, data.currency, data.priceHint)}
        />
        <Stat
          label="52-wk range"
          value={formatRange(data.week52Low, data.week52High, data.currency, data.priceHint)}
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
          press cursor-pointer text-ink-4
          hover:text-ink
          absolute top-0 right-8 z-10 grid size-7 place-items-center
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
        <StateMessage
          message={`Couldn’t load ${symbol}.`}
          action={<RetryButton onRetry={refresh} retrying={isRefreshing} />}
        />
      ) : (
        <DetailSkeleton />
      )}
    </div>
  );
}
