import { CandlestickChart, LineChart } from "lucide-react";
import { IconActionButton } from "@/components/IconActionButton";
import { RetryButton, StateMessage } from "@/components/StateMessage";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { Skeleton } from "@/components/ui/skeleton";
import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";
import {
  formatCountdown,
  formatExchangeTime,
  formatNumber,
  formatPrice,
  formatVolume,
} from "@/widgets/stocks/lib/format";
import {
  changeOf,
  changeTone,
  directionOf,
  extendedSession,
  isAlwaysOpen,
  marketState,
  referencePrice,
} from "@/widgets/stocks/lib/quote";
import { useQuote } from "@/widgets/stocks/hooks/useQuote";
import { useStocksSync } from "@/widgets/stocks/hooks/useStocksSync";
import { useStocks, useStocksStore } from "@/widgets/stocks/useStocksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { ChangeValue } from "@/widgets/stocks/components/ChangeValue";
import { PriceChart } from "@/widgets/stocks/components/PriceChart";
import { RangeChips } from "@/widgets/stocks/components/RangeChips";
import { StockRemoveButton } from "@/widgets/stocks/components/StockRemoveButton";
import { RANGE_LABEL, type Quote, type StockRange } from "@/widgets/stocks/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className={TYPE.rowMeta}>{label}</dt>
      <dd className="text-ink truncate text-caption tabular-nums slashed-zero">{value}</dd>
    </div>
  );
}

function RangeMeter({
  label,
  low,
  high,
  value,
  priceHint,
}: {
  label: string;
  low: number | null;
  high: number | null;
  value: number;
  priceHint: number;
}) {
  if (low == null || high == null) return null;
  const fraction = high > low ? Math.min(1, Math.max(0, (value - low) / (high - low))) : 0.5;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className={TYPE.rowMeta}>{label}</dt>
      <dd className="flex flex-col gap-1">
        <div className="bg-foreground/10 relative h-1 rounded-full">
          <span
            className="
              bg-ink absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full
            "
            style={{ left: `${fraction * 100}%` }}
          />
        </div>
        <div className="text-ink-3 flex justify-between text-micro tabular-nums slashed-zero">
          <span>{formatNumber(low, priceHint)}</span>
          <span>{formatNumber(high, priceHint)}</span>
        </div>
      </dd>
    </div>
  );
}

function MarketStatus({ data }: { data: Quote }) {
  const clock24h = useAppSettingsStore((state) => state.clock24h);
  const now = Date.now();
  const state = isAlwaysOpen(data) ? "open" : marketState(data, now);
  const opensInMs = data.sessionStart != null ? data.sessionStart * 1000 - now : null;
  const asOf =
    data.asOf != null ? formatExchangeTime(data.asOf, data.exchangeTimezone, !clock24h) : null;
  const venue = data.exchange ? `${data.exchange} · ` : "";

  return (
    <span className="text-ink-3 flex min-w-0 items-center gap-1.5 text-caption">
      {state === "open" ? (
        <>
          <span className="bg-live size-1.5 shrink-0 rounded-full" />
          <span className="truncate">{data.exchange ?? "Market"} · Open</span>
        </>
      ) : state === "closed" && opensInMs != null && opensInMs > 0 ? (
        <span className="truncate">
          {venue}Opens in {formatCountdown(opensInMs)}
        </span>
      ) : asOf ? (
        <span className="truncate">
          {venue}
          {state === "closed" ? "Closed" : "As of"} · {asOf}
        </span>
      ) : (
        <span className="truncate">
          {venue}
          {state === "closed" ? "Closed" : ""}
        </span>
      )}
    </span>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="min-h-16 flex-1" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
    </div>
  );
}

function DetailBody({ data, range }: { data: Quote; range: StockRange }) {
  const instanceId = useWidgetInstanceId();
  const changeMode = useStocks((d) => d.changeMode);
  const chartStyle = useStocks((d) => d.chartStyle);
  const setRange = useStocksStore((s) => s.setRange);
  const setChartStyle = useStocksStore((s) => s.setChartStyle);

  const reference = referencePrice(data, range);
  const { change, percent } = changeOf(data.price, reference);
  const direction = directionOf(change);
  const extended = extendedSession(data, Date.now());
  const candles = chartStyle === "candle";

  return (
    <div className="scroll-fade flex h-full min-h-0 flex-col gap-2 overflow-x-hidden overflow-y-auto">
      <div className="flex shrink-0 flex-col gap-1 pr-8">
        <div className="flex items-baseline gap-2">
          <span className={cn(TYPE.title, "shrink-0")}>{data.symbol}</span>
          <span className={cn(TYPE.rowSubtitle, "min-w-0 truncate")}>{data.name}</span>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-ink text-heading leading-none font-semibold tabular-nums slashed-zero">
            {formatPrice(data.price, data.currency, data.priceHint)}
          </span>
          <ChangeValue change={change} percent={percent} mode={changeMode} variant="chip" />
          {range !== "1d" ? <span className={TYPE.rowMeta}>over {RANGE_LABEL[range]}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <MarketStatus data={data} />
          {extended ? (
            <span className="flex items-baseline gap-1 text-caption">
              <span className="text-ink-4">
                {extended.kind === "pre" ? "Pre-market" : "After hours"}
              </span>
              <span className="text-ink tabular-nums slashed-zero">
                {formatNumber(extended.price, data.priceHint)}
              </span>
              <span
                className={cn(
                  "tabular-nums slashed-zero",
                  changeTone(directionOf(extended.change)),
                )}
              >
                {extended.percent >= 0 ? "+" : "−"}
                {Math.abs(extended.percent).toFixed(2)}%
              </span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <RangeChips value={range} onChange={(next) => setRange(instanceId, next)} />
        </div>
        <IconActionButton
          icon={candles ? CandlestickChart : LineChart}
          label={candles ? "Show a line chart" : "Show candles"}
          tooltip={candles ? "Line chart" : "Candlesticks"}
          onClick={() => setChartStyle(instanceId, candles ? "line" : "candle")}
        />
      </div>

      <PriceChart
        bars={data.bars}
        direction={direction}
        baseline={reference}
        style={chartStyle}
        range={range}
        priceHint={data.priceHint}
        timeZone={data.exchangeTimezone}
        dividends={data.dividends}
        className="min-h-20 flex-1"
      />

      <dl className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-2">
        <RangeMeter
          label="Day range"
          low={data.dayLow}
          high={data.dayHigh}
          value={data.price}
          priceHint={data.priceHint}
        />
        <RangeMeter
          label="52-week range"
          low={data.week52Low}
          high={data.week52High}
          value={data.price}
          priceHint={data.priceHint}
        />
        <Stat label="Prev close" value={formatNumber(data.previousClose, data.priceHint)} />
        <Stat label="Volume" value={data.volume != null ? formatVolume(data.volume) : "—"} />
      </dl>
    </div>
  );
}

type StockDetailProps = {
  symbol: string;
  onRemove: () => void;
};

export function StockDetail({ symbol, onRemove }: StockDetailProps) {
  const { state, data, refresh, isRefreshing, lastSyncedAt, range } = useQuote(symbol, {
    focused: true,
  });
  useStocksSync(refresh, isRefreshing, lastSyncedAt);

  return (
    <div className="relative h-full">
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
